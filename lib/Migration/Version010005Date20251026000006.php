<?php

declare(strict_types=1);

namespace OCA\Renamer\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010005Date20251026000006 extends SimpleMigrationStep {
	public function getName(): string {
		return 'Create renamer_covers table';
	}

	/**
	 * @param IOutput $output
	 * @param Closure $schemaClosure The `\Closure` returns a `ISchemaWrapper`
	 * @param array $options
	 *
	 * @return ISchemaWrapper
	 */
	#[\Override]
	public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ISchemaWrapper {
		/** @var ISchemaWrapper $schema */
		$schema = $schemaClosure();

		if (!$schema->hasTable('renamer_covers')) {
			$table = $schema->createTable('renamer_covers');
			$table->addColumn('hash', 'string', [
				'notnull' => true,
				'length' => 40,
			]);
			$table->addColumn('source_path', 'string', [
				'notnull' => true,
				'length' => 512,
			]);
			$table->addColumn('source_mtime', 'bigint', [
				'notnull' => true,
				'default' => 0,
				'length' => 8,
			]);
			$table->addColumn('source_size', 'bigint', [
				'notnull' => true,
				'default' => 0,
				'length' => 8,
			]);
			$table->addColumn('cover_path', 'string', [
				'notnull' => true,
				'length' => 512,
			]);
			$table->addColumn('created_at', 'datetime', [
				'notnull' => false,
				'default' => 'CURRENT_TIMESTAMP',
			]);
			$table->addColumn('updated_at', 'datetime', [
				'notnull' => false,
				'default' => 'CURRENT_TIMESTAMP',
			]);
			$table->setPrimaryKey(['hash']);
			$table->addIndex(['source_path']);
		}

		return $schema;
	}
}