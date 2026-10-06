"use strict";

(function (global) {
    var ERROR_CODE = {
        0: 'ERAR_SUCCESS',
        10: 'ERAR_END_ARCHIVE',
        11: 'ERAR_NO_MEMORY',
        12: 'ERAR_BAD_DATA',
        13: 'ERAR_BAD_ARCHIVE',
        14: 'ERAR_UNKNOWN_FORMAT',
        15: 'ERAR_EOPEN',
        16: 'ERAR_ECREATE',
        17: 'ERAR_ECLOSE',
        18: 'ERAR_EREAD',
        19: 'ERAR_EWRITE',
        20: 'ERAR_SMALL_BUF',
        21: 'ERAR_UNKNOWN',
        22: 'ERAR_MISSING_PASSWORD',
        23: 'ERAR_EREFERENCE',
        24: 'ERAR_BAD_PASSWORD',
    };

    var ERROR_MSG = {
        ERAR_NO_MEMORY: 'Not enough memory',
        ERAR_BAD_DATA: 'Archive header or data are damaged',
        ERAR_BAD_ARCHIVE: 'File is not RAR archive',
        ERAR_UNKNOWN_FORMAT: 'Unknown archive format',
        ERAR_EOPEN: 'File open error',
        ERAR_ECREATE: 'File create error',
        ERAR_ECLOSE: 'File close error',
        ERAR_EREAD: 'File read error',
        ERAR_EWRITE: 'File write error',
        ERAR_SMALL_BUF: 'Buffer for archive comment is too small, comment truncated',
        ERAR_UNKNOWN: 'Unknown error',
        ERAR_MISSING_PASSWORD: 'Password for encrypted file or header is not specified',
        ERAR_EREFERENCE: 'Cannot open file source for reference record',
        ERAR_BAD_PASSWORD: 'Wrong password is specified',
    };

    function UnrarError(reason, message, file) {
        Error.call(this);
        this.name = 'UnrarError';
        this.message = message;
        this.reason = reason;
        this.file = file;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, UnrarError);
        } else {
            this.stack = (new Error()).stack;
        }
    }
    UnrarError.prototype = Object.create(Error.prototype);
    UnrarError.prototype.constructor = UnrarError;

    function DataFile(data) {
        this.buffers = [];
        this.pos = 0;
        this.size = 0;
        if (data) {
            this.buffers.push(data);
            this.size = data.byteLength;
            this.pos = 0;
        }
    }
    DataFile.prototype.read = function (size) {
        this.flatten();
        if (size + this.pos > this.size) {
            return null;
        }
        var oldPos = this.pos;
        this.pos += size;
        return this.buffers[0].slice(oldPos, this.pos);
    };
    DataFile.prototype.readAll = function () {
        this.flatten();
        return this.buffers[0] || new Uint8Array();
    };
    DataFile.prototype.write = function (data) {
        this.buffers.push(data);
        this.size += data.byteLength;
        this.pos += data.byteLength;
        return true;
    };
    DataFile.prototype.tell = function () {
        return this.pos;
    };
    DataFile.prototype.seek = function (pos, method) {
        var newPos = this.pos;
        if (method === 'SET') {
            newPos = pos;
        } else if (method === 'CUR') {
            newPos += pos;
        } else {
            newPos = this.size - pos;
        }
        if (newPos < 0 || newPos > this.size) {
            return false;
        }
        this.pos = newPos;
        return true;
    };
    DataFile.prototype.flatten = function () {
        if (this.buffers.length <= 1) {
            return;
        }
        var newBuffer = new Uint8Array(this.size);
        var offset = 0;
        for (var i = 0; i < this.buffers.length; i++) {
            newBuffer.set(this.buffers[i], offset);
            offset += this.buffers[i].byteLength;
        }
        this.buffers = [newBuffer];
    };

    function Extractor(unrar, password) {
        this.unrar = unrar;
        this._password = password || '';
        this._archive = null;
        this._filePath = '';
        this.dataFiles = null;
        this.dataFileMap = null;
        this.currentFd = 0;
    }

    Extractor.prototype.getFileList = function () {
        var self = this;
        var arcHeader = self.openArc(true);
        var fileHeaders = [];
        while (true) {
            var arcFile = self.processNextFile(function () { return true; });
            if (arcFile === 'ERAR_END_ARCHIVE') {
                break;
            }
            fileHeaders.push(arcFile.fileHeader);
        }
        self.closeArc();
        return { arcHeader: arcHeader, fileHeaders: fileHeaders };
    };

    Extractor.prototype.extract = function (options) {
        var self = this;
        options = options || {};
        var files = options.files;
        var password = options.password;
        var arcHeader = self.openArc(false, password);
        var results = [];
        var count = 0;
        while (true) {
            var shouldSkip = function () { return false; };
            if (Array.isArray(files)) {
                if (count === files.length) {
                    break;
                }
                shouldSkip = function (fileHeader) { return files.indexOf(fileHeader.name) === -1; };
            } else if (files) {
                shouldSkip = function (fileHeader) { return !files(fileHeader); };
            }
            var arcFile = self.processNextFile(shouldSkip);
            if (arcFile === 'ERAR_END_ARCHIVE') {
                break;
            }
            if (arcFile.extraction === 'skipped') {
                continue;
            }
            count++;
            results.push({ fileHeader: arcFile.fileHeader });
        }
        self.closeArc();
        return { arcHeader: arcHeader, files: results };
    };

    Extractor.prototype.fileCreated = function (filename) { return; };
    Extractor.prototype.close = function (fd) { this.closeFile(fd); };

    Extractor.prototype.openArc = function (listOnly, password) {
        var self = this;
        self._archive = new self.unrar.RarArchive();
        var header = self._archive.open(self._filePath, password ? password : self._password, listOnly);
        if (header.state.errCode !== 0) {
            throw self.getFailException(header.state.errCode, header.state.errType);
        }
        return {
            comment: header.comment,
            flags: {
                volume: (header.flags & 0x0001) !== 0,
                lock: (header.flags & 0x0004) !== 0,
                solid: (header.flags & 0x0008) !== 0,
                authInfo: (header.flags & 0x0020) !== 0,
                recoveryRecord: (header.flags & 0x0040) !== 0,
                headerEncrypted: (header.flags & 0x0080) !== 0,
            },
        };
    };

    Extractor.prototype.processNextFile = function (shouldSkip) {
        var self = this;
        function getDateString(dosTime) {
            var bitLen = [5, 6, 5, 5, 4, 7];
            var parts = [];
            for (var i = 0; i < bitLen.length; i++) {
                parts.push(dosTime & ((1 << bitLen[i]) - 1));
                dosTime >>= bitLen[i];
            }
            parts = parts.reverse();
            var pad = function (num) { return num < 10 ? '0' + num : '' + num; };
            return ('' + (1980 + parts[0]) + '-' + pad(parts[1]) + '-' + pad(parts[2]) +
                'T' + pad(parts[3]) + ':' + pad(parts[4]) + ':' + pad(parts[5] * 2) + '.000');
        }
        function getMethod(method) {
            var methodMap = {
                0x30: 'Storing', 0x31: 'Fastest', 0x32: 'Fast',
                0x33: 'Normal', 0x34: 'Good', 0x35: 'Best',
            };
            return methodMap[method] || 'Unknown';
        }
        var arcFileHeader = self._archive.getFileHeader();
        if (arcFileHeader.state.errCode === 10) {
            return 'ERAR_END_ARCHIVE';
        }
        if (arcFileHeader.state.errCode !== 0) {
            throw self.getFailException(arcFileHeader.state.errCode, arcFileHeader.state.errType);
        }
        var fileHeader = {
            name: arcFileHeader.name,
            flags: {
                encrypted: (arcFileHeader.flags & 0x04) !== 0,
                solid: (arcFileHeader.flags & 0x10) !== 0,
                directory: (arcFileHeader.flags & 0x20) !== 0,
            },
            packSize: arcFileHeader.packSize,
            unpSize: arcFileHeader.unpSize,
            crc: arcFileHeader.crc,
            time: getDateString(arcFileHeader.time),
            unpVer: (Math.floor(arcFileHeader.unpVer / 10)) + '.' + (arcFileHeader.unpVer % 10),
            method: getMethod(arcFileHeader.method),
            comment: arcFileHeader.comment,
        };
        var skip = shouldSkip(fileHeader);
        var fileState = self._archive.readFile(skip);
        if (fileState.errCode !== 0) {
            throw self.getFailException(fileState.errCode, fileState.errType, fileHeader.name);
        }
        return {
            fileHeader: fileHeader,
            extraction: skip ? 'skipped' : 'extracted',
        };
    };

    Extractor.prototype.closeArc = function () {
        this._archive.delete();
        this._archive = null;
    };

    Extractor.prototype.getFailException = function (errCode, _errType, file) {
        var reason = ERROR_CODE[errCode];
        this.closeArc();
        return new UnrarError(reason, ERROR_MSG[reason], file);
    };

    function ExtractorData(unrar, data, password) {
        Extractor.call(this, unrar, password);
        this.dataFiles = {};
        this.dataFileMap = {};
        this.currentFd = 1;
        var rarFile = {
            file: new DataFile(new Uint8Array(data)),
            fd: this.currentFd++,
        };
        this._filePath = '_defaultUnrarJS_.rar';
        this.dataFiles[this._filePath] = rarFile;
        this.dataFileMap[rarFile.fd] = this._filePath;
    }
    ExtractorData.prototype = Object.create(Extractor.prototype);
    ExtractorData.prototype.constructor = ExtractorData;

    ExtractorData.prototype.extract = function (options) {
        var self = this;
        var result = Extractor.prototype.extract.call(self, options);
        var files = [];
        for (var i = 0; i < result.files.length; i++) {
            var file = result.files[i];
            if (!file.fileHeader.flags.directory) {
                file.extraction = self.dataFiles[self.getExtractedFileName(file.fileHeader.name)].file.readAll();
            }
            files.push(file);
        }
        return { arcHeader: result.arcHeader, files: files };
    };

    ExtractorData.prototype.getExtractedFileName = function (filename) {
        return '*Extracted*/' + filename;
    };

    ExtractorData.prototype.open = function (filename) {
        var dataFile = this.dataFiles[filename];
        if (!dataFile) {
            return 0;
        }
        return dataFile.fd;
    };

    ExtractorData.prototype.create = function (filename) {
        var fd = this.currentFd++;
        this.dataFiles[this.getExtractedFileName(filename)] = {
            file: new DataFile(),
            fd: this.currentFd++,
        };
        this.dataFileMap[fd] = this.getExtractedFileName(filename);
        return fd;
    };

    ExtractorData.prototype.closeFile = function (fd) {
        var fileData = this.dataFiles[this.dataFileMap[fd]];
        if (!fileData) {
            return;
        }
        fileData.file.seek(0, 'SET');
    };

    ExtractorData.prototype.read = function (fd, buf, size) {
        var fileData = this.dataFiles[this.dataFileMap[fd]];
        if (!fileData) {
            return -1;
        }
        var data = fileData.file.read(size);
        if (data === null) {
            return -1;
        }
        this.unrar.HEAPU8.set(data, buf);
        return data.byteLength;
    };

    ExtractorData.prototype.write = function (fd, buf, size) {
        var fileData = this.dataFiles[this.dataFileMap[fd]];
        if (!fileData) {
            return false;
        }
        fileData.file.write(this.unrar.HEAPU8.slice(buf, buf + size));
        return true;
    };

    ExtractorData.prototype.tell = function (fd) {
        var fileData = this.dataFiles[this.dataFileMap[fd]];
        if (!fileData) {
            return -1;
        }
        return fileData.file.tell();
    };

    ExtractorData.prototype.seek = function (fd, pos, method) {
        var fileData = this.dataFiles[this.dataFileMap[fd]];
        if (!fileData) {
            return false;
        }
        return fileData.file.seek(pos, method);
    };

    var _unrarInstance = null;
    var _unrarModulePromise = null;

    function getUnrarScriptDir() {
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].src || '';
            if (src.indexOf('unrar.js') !== -1) {
                return src.replace(/[^/]*$/, '');
            }
        }
        return '';
    }

    function getUnrarInstance() {
        if (!_unrarModulePromise) {
            var Module = global.Module;
            if (!Module) {
                return Promise.reject(new Error('unrar.js WASM module not loaded'));
            }
            var scriptDir = getUnrarScriptDir();
            _unrarModulePromise = Module({
                locateFile: function (path) {
                    if (scriptDir) return scriptDir + path;
                    return path;
                }
            }).then(function (instance) {
                return instance;
            });
        }
        return _unrarModulePromise;
    }

    function getUnrar(options) {
        if (options && options.wasmBinary) {
            if (_unrarInstance) return Promise.resolve(_unrarInstance);
            var Module = global.Module;
            if (!Module) {
                return Promise.reject(new Error('unrar.js WASM module not loaded'));
            }
            return Module({ wasmBinary: options.wasmBinary }).then(function (instance) {
                _unrarInstance = instance;
                return instance;
            });
        }
        return getUnrarInstance();
    }

    function createExtractorFromData(options) {
        options = options || {};
        var data = options.data;
        var password = options.password || '';
        return getUnrar(options.wasmBinary ? { wasmBinary: options.wasmBinary } : null).then(function (unrar) {
            var extractor = new ExtractorData(unrar, data, password);
            unrar.extractor = extractor;
            return extractor;
        });
    }

    global.RenamerUnrar = {
        createExtractorFromData: createExtractorFromData,
        ExtractorData: ExtractorData,
        Extractor: Extractor,
        DataFile: DataFile,
        UnrarError: UnrarError,
        getUnrar: getUnrar,
    };
})(typeof window !== 'undefined' ? window : this);
