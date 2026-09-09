"""
===============================================================================
MODULE: SQLITE HOT BACKUP SERVICE
===============================================================================
Provides safe, lock-free Online SQLite backups for PKS Management LPR Auto (V5).
Features:
  - Non-blocking SQLite Online Backup API (Thread Executor)
  - Automatic GZIP stream compression (.db.gz)
  - SHA-256 Checksum verification
  - Automatic retention rotation & pruning
  - Staging verification before restoring
===============================================================================
"""

import os
import sys
import time
import gzip
import shutil
import sqlite3
import hashlib
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.stdio import print_debug, print_success, print_warning, print_error, time_now

BACKUP_DIR = "./database/backups"
DB_PATH = "./database/database.db"
DEFAULT_RETENTION_COUNT = 14  # Keep last 14 backups by default


def _compute_sha256(file_path: str) -> str:
    """Calculate SHA256 checksum of a file"""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def _sync_create_backup(db_path: str, backup_dir: str, compress: bool, custom_name: Optional[str] = None) -> Dict[str, Any]:
    """Synchronous worker that performs SQLite online backup and compression"""
    os.makedirs(backup_dir, exist_ok=True)
    now = time_now()
    timestamp_str = now.strftime("%Y%m%d_%H%M%S")
    
    base_name = custom_name if custom_name else f"database_backup_{timestamp_str}"
    raw_backup_path = os.path.join(backup_dir, f"{base_name}.db")
    
    t0 = time.perf_counter()
    
    # 1. Perform SQLite Online Backup API (thread-safe, lock-free for WAL mode)
    with sqlite3.connect(db_path, timeout=30.0) as src_conn:
        with sqlite3.connect(raw_backup_path) as dst_conn:
            src_conn.backup(dst_conn, pages=100, sleep=0.01)
            
    raw_size = os.path.getsize(raw_backup_path)
    
    # 2. Compress to GZIP if requested
    final_path = raw_backup_path
    compressed_size = raw_size
    is_compressed = False
    
    if compress:
        gz_path = f"{raw_backup_path}.gz"
        with open(raw_backup_path, "rb") as f_in:
            with gzip.open(gz_path, "wb", compresslevel=6) as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        # Remove raw uncompressed file
        os.remove(raw_backup_path)
        final_path = gz_path
        compressed_size = os.path.getsize(gz_path)
        is_compressed = True
        
    t1 = time.perf_counter()
    duration_ms = (t1 - t0) * 1000
    sha256 = _compute_sha256(final_path)
    
    return {
        "success": True,
        "filename": os.path.basename(final_path),
        "file_path": final_path,
        "raw_size_bytes": raw_size,
        "compressed_size_bytes": compressed_size,
        "raw_size_mb": round(raw_size / (1024 * 1024), 2),
        "compressed_size_mb": round(compressed_size / (1024 * 1024), 2),
        "is_compressed": is_compressed,
        "sha256": sha256,
        "timestamp": now.isoformat(),
        "duration_ms": round(duration_ms, 2)
    }


def _sync_prune_old_backups(backup_dir: str, keep_count: int) -> List[str]:
    """Prune older backups exceeding the retention threshold"""
    if not os.path.exists(backup_dir):
        return []
    
    deleted_files = []
    # Collect all backup files (excluding internal staging files)
    files = [
        os.path.join(backup_dir, f)
        for f in os.listdir(backup_dir)
        if (f.endswith(".db") or f.endswith(".db.gz")) and not f.startswith("_")
    ]
    
    # Sort by modification time descending (newest first)
    files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    
    # Remove files exceeding keep_count
    if len(files) > keep_count:
        for old_file in files[keep_count:]:
            try:
                os.remove(old_file)
                deleted_files.append(os.path.basename(old_file))
                print_debug(f"🗑️ Pruned old backup: {os.path.basename(old_file)}")
            except Exception as e:
                print_warning(f"Failed to prune backup {old_file}: {e}")
                
    return deleted_files


async def create_hot_backup(
    db_path: str = DB_PATH,
    backup_dir: str = BACKUP_DIR,
    compress: bool = True,
    custom_name: Optional[str] = None,
    keep_count: int = DEFAULT_RETENTION_COUNT
) -> Dict[str, Any]:
    """
    Creates an online, non-blocking hot backup of the SQLite database.
    
    Args:
        db_path: Path to live SQLite database (default: ./database/database.db)
        backup_dir: Directory where backups are stored (default: ./database/backups)
        compress: Whether to gzip compress the backup file (default: True)
        custom_name: Optional custom prefix name for the backup file
        keep_count: Number of latest backups to retain (default: 14)
        
    Returns:
        Dictionary containing backup details (path, sizes, sha256, duration)
    """
    print_debug(f"📦 Starting SQLite Online Hot Backup for {db_path}...")
    
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database file not found: {db_path}")
        
    # Execute non-blocking in thread pool
    result = await asyncio.to_thread(_sync_create_backup, db_path, backup_dir, compress, custom_name)
    
    # Execute retention cleanup in thread pool
    pruned = await asyncio.to_thread(_sync_prune_old_backups, backup_dir, keep_count)
    result["pruned_files"] = pruned
    
    print_success(
        f"✅ Hot Backup completed: {result['filename']} "
        f"({result['compressed_size_mb']} MB, SHA256: {result['sha256'][:8]}...) in {result['duration_ms']}ms"
    )
    return result


async def list_backups(backup_dir: str = BACKUP_DIR) -> List[Dict[str, Any]]:
    """
    Lists all existing backups with metadata.
    """
    if not os.path.exists(backup_dir):
        return []
        
    def _sync_list():
        backups = []
        for fname in os.listdir(backup_dir):
            if fname.endswith(".db") or fname.endswith(".db.gz"):
                fpath = os.path.join(backup_dir, fname)
                mtime = os.path.getmtime(fpath)
                size_bytes = os.path.getsize(fpath)
                backups.append({
                    "filename": fname,
                    "file_path": fpath,
                    "size_bytes": size_bytes,
                    "size_mb": round(size_bytes / (1024 * 1024), 2),
                    "created_at": datetime.fromtimestamp(mtime).isoformat(),
                    "is_compressed": fname.endswith(".gz")
                })
        # Sort newest first
        backups.sort(key=lambda x: x["created_at"], reverse=True)
        return backups

    return await asyncio.to_thread(_sync_list)


async def delete_backup(filename: str, backup_dir: str = BACKUP_DIR) -> Dict[str, Any]:
    """
    Deletes a specific backup file safely.
    """
    # Prevent directory traversal attacks
    safe_filename = os.path.basename(filename)
    fpath = os.path.join(backup_dir, safe_filename)
    
    if not os.path.exists(fpath):
        return {"success": False, "error": f"Backup file '{safe_filename}' not found"}
        
    def _sync_del():
        os.remove(fpath)
        return {"success": True, "deleted_filename": safe_filename}
        
    return await asyncio.to_thread(_sync_del)


async def restore_hot_backup(
    filename: str,
    db_path: str = DB_PATH,
    backup_dir: str = BACKUP_DIR
) -> Dict[str, Any]:
    """
    Restores the database from a backup file with staging validation.
    
    Steps:
      1. Validates filename and extracts to staging file if compressed.
      2. Runs PRAGMA integrity_check on staging DB.
      3. Takes a safety checkpoint backup of the current database before overwriting.
      4. Restores staging DB into target DB using SQLite Backup API.
    """
    safe_filename = os.path.basename(filename)
    src_backup_path = os.path.join(backup_dir, safe_filename)
    
    if not os.path.exists(src_backup_path):
        return {"success": False, "error": f"Backup file '{safe_filename}' not found"}
        
    def _sync_restore():
        staging_db_path = os.path.join(backup_dir, "_staging_restore.db")
        safety_backup_path = os.path.join(backup_dir, f"_safety_pre_restore_{int(time.time())}.db")
        
        try:
            # 1. Decompress to staging file if gzip
            if safe_filename.endswith(".gz"):
                with gzip.open(src_backup_path, "rb") as f_in:
                    with open(staging_db_path, "wb") as f_out:
                        shutil.copyfileobj(f_in, f_out)
            else:
                shutil.copyfile(src_backup_path, staging_db_path)
                
            # 2. Verify integrity of staging database
            with sqlite3.connect(staging_db_path) as staging_conn:
                integrity = staging_conn.execute("PRAGMA integrity_check;").fetchone()[0]
                if integrity != "ok":
                    raise ValueError(f"Staging database integrity check failed: {integrity}")
                    
            # 3. Create a safety backup of current live DB
            if os.path.exists(db_path):
                with sqlite3.connect(db_path) as live_conn:
                    with sqlite3.connect(safety_backup_path) as safe_conn:
                        live_conn.backup(safe_conn)
                        
            # 4. Restore staging into live DB
            with sqlite3.connect(staging_db_path) as staging_conn:
                with sqlite3.connect(db_path) as live_conn:
                    staging_conn.backup(live_conn)
                    
            return {
                "success": True,
                "restored_from": safe_filename,
                "safety_backup": os.path.basename(safety_backup_path),
                "integrity_check": "ok"
            }
        finally:
            if os.path.exists(staging_db_path):
                try:
                    os.remove(staging_db_path)
                except Exception:
                    pass

    result = await asyncio.to_thread(_sync_restore)
    if result.get("success"):
        print_success(f"✅ Successfully restored database from {safe_filename}")
    else:
        print_error(f"❌ Restore failed: {result.get('error')}")
    return result
