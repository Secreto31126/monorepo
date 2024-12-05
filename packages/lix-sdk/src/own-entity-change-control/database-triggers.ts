import type { SqliteDatabase } from "sqlite-wasm-kysely";
import type { LixDatabaseSchema, Snapshot } from "../database/schema.js";
import type { Kysely } from "kysely";
import {
	changeControlledTableIds,
	entityIdForRow,
	type PragmaTableInfo,
} from "./change-controlled-tables.js";
import { createChange } from "../change/create-change.js";

export function applyOwnEntityChangeControlTriggers(
	sqlite: SqliteDatabase,
	db: Kysely<LixDatabaseSchema>
): void {
	const tableInfos: Record<string, PragmaTableInfo> = {};

	for (const table of Object.keys(changeControlledTableIds)) {
		tableInfos[table] = sqlite.exec({
			sql: `PRAGMA table_info(${table});`,
			returnValue: "resultRows",
			rowMode: "object",
		}) as PragmaTableInfo;
	}

	sqlite.createFunction({
		name: "handle_lix_own_entity_change",
		arity: -1,
		// @ts-expect-error - dynamic function
		xFunc: (
			_ctx: number,
			tableName: keyof typeof changeControlledTableIds,
			operation: "insert" | "update" | "delete",
			...value
		) => {
			handleLixOwnEntityChange(db, tableName, tableInfos, operation, ...value);
		},
	});

	for (const table of Object.keys(changeControlledTableIds)) {
		const tableInfo = tableInfos[table]!;

		const sql = `
      CREATE TEMP TRIGGER IF NOT EXISTS ${table}_change_control_insert
      AFTER INSERT ON ${table}
      BEGIN
        SELECT handle_lix_own_entity_change('${table}', 'insert', ${tableInfo.map((c) => "NEW." + c.name).join(", ")});
      END;
      
      CREATE TEMP TRIGGER IF NOT EXISTS ${table}_change_control_update
      AFTER UPDATE ON ${table}
      BEGIN
        SELECT handle_lix_own_entity_change('${table}', 'update', ${tableInfo.map((c) => "NEW." + c.name).join(", ")});
      END;

      CREATE TEMP TRIGGER IF NOT EXISTS ${table}_change_control_delete
      AFTER DELETE ON ${table}
      BEGIN
        SELECT handle_lix_own_entity_change('${table}', 'delete', ${tableInfo.map((c) => "OLD." + c.name).join(", ")});
      END;
      `;

		sqlite.exec(sql);
	}
}

async function handleLixOwnEntityChange(
	db: Kysely<LixDatabaseSchema>,
	tableName: keyof typeof changeControlledTableIds,
	tableInfos: Record<keyof typeof changeControlledTableIds, PragmaTableInfo>,
	operation: "insert" | "update" | "delete",
	...values: any[]
): Promise<void> {
	const executeInTransaction = async (trx: Kysely<LixDatabaseSchema>) => {
		// need to break the loop if own changes are detected
		const change = await trx
			.selectFrom("change")
			.where("id", "=", values[0])
			.select("plugin_key")
			.executeTakeFirst();

		if (change?.plugin_key === "lix_own_entity") {
			return;
		}
		const currentVersion = await trx
			.selectFrom("current_version")
			.innerJoin("version", "current_version.id", "version.id")
			.selectAll("version")
			.executeTakeFirstOrThrow();

		const authors = await trx
			.selectFrom("active_account")
			.selectAll()
			.execute();

		if (authors.length === 0) {
			console.error(tableName, change);
			throw new Error("At least one author is required");
		}

		let snapshotContent: Snapshot["content"] | null;

		if (operation === "delete") {
			snapshotContent = null;
		} else {
			snapshotContent = {};
			// construct the values as json for the snapshot
			for (const [index, column] of tableInfos[tableName]!.entries()) {
				snapshotContent[column.name] = values[index];
			}
		}

		const entityId = entityIdForRow(tableName, ...values);

		await createChange({
			lix: { db: trx },
			authors: authors,
			version: currentVersion,
			entityId,
			fileId: "null",
			pluginKey: "lix_own_entity",
			schemaKey: `lix_${tableName}`,
			snapshotContent,
		});
	};
	if (db.isTransaction) {
		await executeInTransaction(db);
	} else {
		await db.transaction().execute(executeInTransaction);
	}
}
