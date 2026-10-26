<?php

declare(strict_types=1);

namespace OCA\Renamer\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\IOutput;
use OCP\Migration\SimpleMigrationStep;

class Version010006Date20251026000007 extends SimpleMigrationStep {
	public function getName(): string {
		return 'Create renamer_translations table';
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

		if (!$schema->hasTable('renamer_translations')) {
			$table = $schema->createTable('renamer_translations');
			$table->addColumn('id', 'integer', [
				'autoincrement' => true,
				'notnull' => true,
				'length' => 4,
				'unsigned' => true,
			]);
			$table->addColumn('user_id', 'string', [
				'notnull' => true,
				'length' => 64,
			]);
			$table->addColumn('translation_key', 'string', [
				'notnull' => true,
				'length' => 255,
			]);
			$table->addColumn('language', 'string', [
				'notnull' => true,
				'length' => 10,
			]);
			$table->addColumn('translated_text', 'text', [
				'notnull' => true,
			]);
			$table->addColumn('created_at', 'datetime', [
				'notnull' => false,
				'default' => 'CURRENT_TIMESTAMP',
			]);
			$table->addColumn('updated_at', 'datetime', [
				'notnull' => false,
				'default' => 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
			]);
			$table->setPrimaryKey(['id']);
			$table->addUniqueIndex(['user_id', 'translation_key', 'language']);
		}

		return $schema;
	}
}