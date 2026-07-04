import Foundation

// The current ExpoSQLite Swift module does not always import the C API symbols
// from sqlite3.h, so we declare the used entry points explicitly.

typealias ExpoSQLiteUpdateHookCallback = @convention(c) (
  UnsafeMutableRawPointer?,
  Int32,
  UnsafePointer<CChar>?,
  UnsafePointer<CChar>?,
  Int64
) -> Void

typealias ExpoSQLiteChangesetFilterCallback = @convention(c) (
  UnsafeMutableRawPointer?,
  UnsafePointer<CChar>?
) -> Int32

typealias ExpoSQLiteChangesetConflictCallback = @convention(c) (
  UnsafeMutableRawPointer?,
  Int32,
  OpaquePointer?
) -> Int32

public let SQLITE_CHANGESET_REPLACE: Int32 = 1

@_silgen_name("exsqlite3_open")
func exsqlite3_open(
  _ filename: UnsafePointer<CChar>?,
  _ ppDb: UnsafeMutablePointer<OpaquePointer?>?
) -> Int32

@_silgen_name("exsqlite3_get_autocommit")
func exsqlite3_get_autocommit(_ db: OpaquePointer?) -> Int32

@_silgen_name("exsqlite3_malloc64")
func exsqlite3_malloc64(_ size: UInt64) -> UnsafeMutableRawPointer?

@_silgen_name("exsqlite3_free")
func exsqlite3_free(_ pointer: UnsafeMutableRawPointer?)

@_silgen_name("exsqlite3_deserialize")
func exsqlite3_deserialize(
  _ db: OpaquePointer?,
  _ schemaName: UnsafePointer<CChar>?,
  _ data: UnsafeMutablePointer<UInt8>?,
  _ dataSize: Int64,
  _ bufferSize: Int64,
  _ flags: UInt32
) -> Int32

@_silgen_name("exsqlite3_exec")
func exsqlite3_exec(
  _ db: OpaquePointer?,
  _ sql: UnsafePointer<CChar>?,
  _ callback: UnsafeMutableRawPointer?,
  _ context: UnsafeMutableRawPointer?,
  _ errorMessage: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>?
) -> Int32

@_silgen_name("exsqlite3_serialize")
func exsqlite3_serialize(
  _ db: OpaquePointer?,
  _ schemaName: UnsafePointer<CChar>?,
  _ size: UnsafeMutablePointer<Int32>?,
  _ flags: UInt32
) -> UnsafeMutablePointer<UInt8>?

@_silgen_name("exsqlite3_prepare_v2")
func exsqlite3_prepare_v2(
  _ db: OpaquePointer?,
  _ sql: UnsafePointer<CChar>?,
  _ nByte: Int32,
  _ statement: UnsafeMutablePointer<OpaquePointer?>?,
  _ tail: UnsafeMutablePointer<UnsafePointer<CChar>?>?
) -> Int32

@_silgen_name("exsqlite3_reset")
func exsqlite3_reset(_ statement: OpaquePointer?) -> Int32

@_silgen_name("exsqlite3_clear_bindings")
func exsqlite3_clear_bindings(_ statement: OpaquePointer?) -> Int32

@_silgen_name("exsqlite3_step")
func exsqlite3_step(_ statement: OpaquePointer?) -> Int32

@_silgen_name("exsqlite3_last_insert_rowid")
func exsqlite3_last_insert_rowid(_ db: OpaquePointer?) -> Int64

@_silgen_name("exsqlite3_changes")
func exsqlite3_changes(_ db: OpaquePointer?) -> Int32

@_silgen_name("exsqlite3_finalize")
func exsqlite3_finalize(_ statement: OpaquePointer?) -> Int32

@_silgen_name("exsqlite3_errcode")
func exsqlite3_errcode(_ db: OpaquePointer?) -> Int32

@_silgen_name("exsqlite3_errmsg")
func exsqlite3_errmsg(_ db: OpaquePointer?) -> UnsafePointer<CChar>?

@_silgen_name("exsqlite3_close")
func exsqlite3_close(_ db: OpaquePointer?) -> Int32

@_silgen_name("exsqlite3_backup_init")
func exsqlite3_backup_init(
  _ destDb: OpaquePointer?,
  _ destDbName: UnsafePointer<CChar>?,
  _ sourceDb: OpaquePointer?,
  _ sourceDbName: UnsafePointer<CChar>?
) -> OpaquePointer?

@_silgen_name("exsqlite3_backup_step")
func exsqlite3_backup_step(_ backup: OpaquePointer?, _ pages: Int32) -> Int32

@_silgen_name("exsqlite3_backup_finish")
func exsqlite3_backup_finish(_ backup: OpaquePointer?) -> Int32

@_silgen_name("exsqlite3_update_hook")
func exsqlite3_update_hook(
  _ db: OpaquePointer?,
  _ callback: ExpoSQLiteUpdateHookCallback?,
  _ context: UnsafeMutableRawPointer?
) -> UnsafeMutableRawPointer?

@_silgen_name("exsqlite3_db_filename")
func exsqlite3_db_filename(
  _ db: OpaquePointer?,
  _ schemaName: UnsafePointer<CChar>?
) -> UnsafePointer<CChar>?

@_silgen_name("exsqlite3_enable_load_extension")
func exsqlite3_enable_load_extension(_ db: OpaquePointer?, _ onOff: Int32) -> Int32

@_silgen_name("exsqlite3_load_extension")
func exsqlite3_load_extension(
  _ db: OpaquePointer?,
  _ fileName: UnsafePointer<CChar>?,
  _ entryPoint: UnsafePointer<CChar>?,
  _ errorMessage: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>?
) -> Int32

@_silgen_name("exsqlite3_column_count")
func exsqlite3_column_count(_ statement: OpaquePointer?) -> Int32

@_silgen_name("exsqlite3_column_name")
func exsqlite3_column_name(_ statement: OpaquePointer?, _ column: Int32) -> UnsafePointer<CChar>?

@_silgen_name("exsqlite3_column_type")
func exsqlite3_column_type(_ statement: OpaquePointer?, _ column: Int32) -> Int32

@_silgen_name("exsqlite3_column_int64")
func exsqlite3_column_int64(_ statement: OpaquePointer?, _ column: Int32) -> Int64

@_silgen_name("exsqlite3_column_double")
func exsqlite3_column_double(_ statement: OpaquePointer?, _ column: Int32) -> Double

@_silgen_name("exsqlite3_column_text")
func exsqlite3_column_text(_ statement: OpaquePointer?, _ column: Int32) -> UnsafePointer<CChar>?

@_silgen_name("exsqlite3_column_blob")
func exsqlite3_column_blob(_ statement: OpaquePointer?, _ column: Int32) -> UnsafeRawPointer?

@_silgen_name("exsqlite3_column_bytes")
func exsqlite3_column_bytes(_ statement: OpaquePointer?, _ column: Int32) -> Int32

@_silgen_name("exsqlite3_bind_null")
func exsqlite3_bind_null(_ statement: OpaquePointer?, _ index: Int32) -> Int32

@_silgen_name("exsqlite3_bind_int64")
func exsqlite3_bind_int64(_ statement: OpaquePointer?, _ index: Int32, _ value: Int64) -> Int32

@_silgen_name("exsqlite3_bind_double")
func exsqlite3_bind_double(_ statement: OpaquePointer?, _ index: Int32, _ value: Double) -> Int32

@_silgen_name("exsqlite3_bind_text")
func exsqlite3_bind_text(
  _ statement: OpaquePointer?,
  _ index: Int32,
  _ value: UnsafePointer<CChar>?,
  _ length: Int32,
  _ destructor: sqlite3_destructor_type?
) -> Int32

@_silgen_name("exsqlite3_bind_blob")
func exsqlite3_bind_blob(
  _ statement: OpaquePointer?,
  _ index: Int32,
  _ value: UnsafeRawPointer?,
  _ length: Int32,
  _ destructor: sqlite3_destructor_type?
) -> Int32

@_silgen_name("exsqlite3_bind_int")
func exsqlite3_bind_int(_ statement: OpaquePointer?, _ index: Int32, _ value: Int32) -> Int32

@_silgen_name("exsqlite3_bind_parameter_index")
func exsqlite3_bind_parameter_index(_ statement: OpaquePointer?, _ name: UnsafePointer<CChar>?) -> Int32

@_silgen_name("exsqlite3_next_stmt")
func exsqlite3_next_stmt(_ db: OpaquePointer?, _ statement: OpaquePointer?) -> OpaquePointer?

@_silgen_name("exsqlite3session_create")
func exsqlite3session_create(
  _ db: OpaquePointer?,
  _ schemaName: UnsafePointer<CChar>?,
  _ session: UnsafeMutablePointer<OpaquePointer?>?
) -> Int32

@_silgen_name("exsqlite3session_attach")
func exsqlite3session_attach(_ session: OpaquePointer?, _ tableName: UnsafePointer<CChar>?) -> Int32

@_silgen_name("exsqlite3session_enable")
func exsqlite3session_enable(_ session: OpaquePointer?, _ enabled: Int32)

@_silgen_name("exsqlite3session_delete")
func exsqlite3session_delete(_ session: OpaquePointer?)

@_silgen_name("exsqlite3session_changeset")
func exsqlite3session_changeset(
  _ session: OpaquePointer?,
  _ size: UnsafeMutablePointer<Int32>?,
  _ changeset: UnsafeMutablePointer<UnsafeMutableRawPointer?>?
) -> Int32

@_silgen_name("exsqlite3changeset_apply")
func exsqlite3changeset_apply(
  _ db: OpaquePointer?,
  _ size: Int32,
  _ changeset: UnsafeMutableRawPointer?,
  _ filter: ExpoSQLiteChangesetFilterCallback?,
  _ conflict: ExpoSQLiteChangesetConflictCallback?,
  _ context: UnsafeMutableRawPointer?
) -> Int32

@_silgen_name("exsqlite3changeset_invert")
func exsqlite3changeset_invert(
  _ size: Int32,
  _ changeset: UnsafeRawPointer?,
  _ outputSize: UnsafeMutablePointer<Int32>?,
  _ output: UnsafeMutablePointer<UnsafeMutableRawPointer?>?
) -> Int32
