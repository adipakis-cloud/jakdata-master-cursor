-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin_pusat', 'koordinator_kecamatan', 'koordinator_kelurahan', 'koordinator_rw', 'koordinator_rt', 'petugas_lapangan', 'manager_warmindo', 'kasir_warmindo', 'auditor', 'finance_admin');

-- CreateEnum
CREATE TYPE "StatusEkonomi" AS ENUM ('sangat_miskin', 'miskin', 'rentan', 'sedang', 'mampu');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('baru', 'diproses', 'menunggu_data', 'eskalasi', 'selesai', 'ditolak');

-- CreateEnum
CREATE TYPE "WarmindoStatus" AS ENUM ('rencana', 'persiapan', 'aktif', 'evaluasi', 'tutup');

-- CreateEnum
CREATE TYPE "AiTaskStatus" AS ENUM ('pending', 'processing', 'done', 'failed');

-- CreateEnum
CREATE TYPE "DistribusiStatus" AS ENUM ('terjadwal', 'diterima', 'tidak_hadir', 'ditolak');

-- CreateEnum
CREATE TYPE "UmkmStatus" AS ENUM ('rintisan', 'aktif', 'berkembang', 'nonaktif');

-- CreateEnum
CREATE TYPE "OperationalAlertStatus" AS ENUM ('open', 'acknowledged', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "no_hp" VARCHAR(20),
    "last_login_at" TIMESTAMP(3),
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "kecamatan_id" INTEGER,
    "kelurahan_id" INTEGER,
    "rw_id" INTEGER,
    "rt_id" INTEGER,
    "warmindo_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "device_info" TEXT,
    "ip_address" VARCHAR(45),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinsi" (
    "id" SERIAL NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "kode" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provinsi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kota" (
    "id" SERIAL NOT NULL,
    "provinsi_id" INTEGER NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "kode" VARCHAR(10) NOT NULL,
    "tipe" VARCHAR(20) NOT NULL DEFAULT 'kota',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kecamatan" (
    "id" SERIAL NOT NULL,
    "kota_id" INTEGER NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "kode" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kecamatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelurahan" (
    "id" SERIAL NOT NULL,
    "kecamatan_id" INTEGER NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "kode" VARCHAR(15),
    "kode_pos" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kelurahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rw" (
    "id" SERIAL NOT NULL,
    "kelurahan_id" INTEGER NOT NULL,
    "nomor" VARCHAR(5) NOT NULL,
    "nama_ketua" VARCHAR(150),
    "no_hp_ketua" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rt" (
    "id" SERIAL NOT NULL,
    "rw_id" INTEGER NOT NULL,
    "nomor" VARCHAR(5) NOT NULL,
    "nama_ketua" VARCHAR(150),
    "no_hp_ketua" VARCHAR(20),
    "jumlah_kk" INTEGER NOT NULL DEFAULT 0,
    "target_warga" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warga" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "rt_id" INTEGER NOT NULL,
    "kk_id" INTEGER,
    "nama" VARCHAR(150) NOT NULL,
    "nik_hash" VARCHAR(64),
    "nik_encrypted" TEXT,
    "no_hp" VARCHAR(20),
    "jenis_kelamin" VARCHAR(1),
    "tanggal_lahir" DATE,
    "alamat" TEXT,
    "pekerjaan" VARCHAR(100),
    "penghasilan_est" DOUBLE PRECISION,
    "status_ekonomi" "StatusEkonomi",
    "kemampuan_kerja" BOOLEAN NOT NULL DEFAULT true,
    "kebutuhan_khusus" TEXT,
    "kategori" VARCHAR(30) NOT NULL DEFAULT 'warga_biasa',
    "diverifikasi" BOOLEAN NOT NULL DEFAULT false,
    "catatan" TEXT,
    "foto_url" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keluarga" (
    "id" SERIAL NOT NULL,
    "rt_id" INTEGER NOT NULL,
    "nama_kepala" VARCHAR(150) NOT NULL,
    "no_kk" VARCHAR(20),
    "no_hp_kepala" VARCHAR(20),
    "jumlah_anggota" INTEGER NOT NULL DEFAULT 1,
    "jumlah_tanggungan" INTEGER NOT NULL DEFAULT 0,
    "status_rumah" VARCHAR(30),
    "status_ekonomi" "StatusEkonomi",
    "total_penghasilan" DOUBLE PRECISION,
    "skor_prioritas_bantuan" DOUBLE PRECISION,
    "kategori_bantuan" VARCHAR(30) NOT NULL DEFAULT 'normal',
    "terdaftar_program" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keluarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "umkm" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "kode_umkm" VARCHAR(30) NOT NULL,
    "nama_usaha" VARCHAR(200) NOT NULL,
    "pemilik_nama" VARCHAR(150) NOT NULL,
    "warga_id" INTEGER,
    "rt_id" INTEGER,
    "kelurahan_id" INTEGER,
    "kategori" VARCHAR(50) NOT NULL,
    "produk_utama" VARCHAR(200),
    "status" "UmkmStatus" NOT NULL DEFAULT 'rintisan',
    "omzet_bulanan_est" DOUBLE PRECISION,
    "jumlah_karyawan" INTEGER NOT NULL DEFAULT 0,
    "no_hp" VARCHAR(20),
    "alamat" TEXT,
    "catatan" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "umkm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_warga" (
    "id" SERIAL NOT NULL,
    "kode_laporan" VARCHAR(20) NOT NULL,
    "channel_type" VARCHAR(20) NOT NULL,
    "nama_pelapor" VARCHAR(150),
    "no_hp_pelapor" VARCHAR(20),
    "isiLaporan" TEXT NOT NULL,
    "kategori" VARCHAR(30) NOT NULL,
    "subkategori" VARCHAR(50),
    "urgency_level" "UrgencyLevel" NOT NULL DEFAULT 'medium',
    "lokasi_text" TEXT,
    "rt_id" INTEGER,
    "kelurahan_id" INTEGER,
    "kecamatan_id" INTEGER,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReportStatus" NOT NULL DEFAULT 'baru',
    "ai_summary" TEXT,
    "ai_recommendation" TEXT,
    "lampiran_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assigned_to" INTEGER,
    "sla_deadline" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_warga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_messages" (
    "id" SERIAL NOT NULL,
    "laporan_id" INTEGER NOT NULL,
    "sender_type" VARCHAR(20) NOT NULL,
    "message_text" TEXT NOT NULL,
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laporan_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_alerts" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "kode_alert" VARCHAR(30) NOT NULL,
    "kategori" VARCHAR(50) NOT NULL,
    "severity" "UrgencyLevel" NOT NULL DEFAULT 'medium',
    "status" "OperationalAlertStatus" NOT NULL DEFAULT 'open',
    "judul" VARCHAR(200) NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'seed',
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "wilayah_level" VARCHAR(20),
    "wilayah_id" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" INTEGER,
    "acknowledged_by" INTEGER,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_by" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bantuan" (
    "id" SERIAL NOT NULL,
    "nama" VARCHAR(200) NOT NULL,
    "tipe" VARCHAR(30) NOT NULL,
    "deskripsi" TEXT,
    "satuan" VARCHAR(30) NOT NULL DEFAULT 'paket',
    "nilai_per_satuan" DOUBLE PRECISION,
    "stok_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stok_tersisa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sumber" VARCHAR(200),
    "tanggal_masuk" TIMESTAMP(3),
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bantuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bantuan_penerima" (
    "id" SERIAL NOT NULL,
    "bantuan_id" INTEGER NOT NULL,
    "keluarga_id" INTEGER,
    "nama_penerima" VARCHAR(150) NOT NULL,
    "rt_id" INTEGER,
    "jumlah_diterima" DOUBLE PRECISION NOT NULL,
    "status" "DistribusiStatus" NOT NULL DEFAULT 'terjadwal',
    "tanggal_diterima" TIMESTAMP(3),
    "bukti_foto_url" TEXT,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bantuan_penerima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_outlet" (
    "id" SERIAL NOT NULL,
    "kode_outlet" VARCHAR(20) NOT NULL,
    "nama_outlet" VARCHAR(200) NOT NULL,
    "kelurahan_id" INTEGER,
    "rt_id" INTEGER,
    "alamat" TEXT,
    "koordinat_lat" DOUBLE PRECISION,
    "koordinat_lng" DOUBLE PRECISION,
    "status" "WarmindoStatus" NOT NULL DEFAULT 'rencana',
    "modal_awal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_omzet_harian" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_laba_bulanan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biaya_sewa_bulanan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "karyawan_total" INTEGER NOT NULL DEFAULT 0,
    "manager_user_id" INTEGER,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "tanggal_buka" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_inventory" (
    "id" SERIAL NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "nama_bahan" VARCHAR(200) NOT NULL,
    "satuan" VARCHAR(20) NOT NULL DEFAULT 'pcs',
    "stok_saat_ini" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stok_minimum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "harga_beli" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "harga_jual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_transaksi" (
    "id" SERIAL NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_omzet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_hpp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gross_profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jumlah_item" INTEGER NOT NULL DEFAULT 0,
    "metode_bayar" VARCHAR(20) NOT NULL DEFAULT 'tunai',
    "items" JSONB NOT NULL DEFAULT '[]',
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warmindo_transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_pengeluaran" (
    "id" SERIAL NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kategori" VARCHAR(30) NOT NULL,
    "deskripsi" VARCHAR(300) NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warmindo_pengeluaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "stored_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "uploaded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_tasks" (
    "id" SERIAL NOT NULL,
    "tipe" VARCHAR(50) NOT NULL,
    "input_data" JSONB NOT NULL,
    "output_data" JSONB,
    "status" "AiTaskStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "model_used" VARCHAR(50),
    "created_by" INTEGER,
    "started_at" TIMESTAMP(3),
    "done_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_reports" (
    "id" SERIAL NOT NULL,
    "tipe" VARCHAR(50) NOT NULL,
    "wilayah_level" VARCHAR(20),
    "wilayah_id" INTEGER,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ringkasan" TEXT NOT NULL,
    "temuan" JSONB NOT NULL DEFAULT '[]',
    "rekomendasi" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_jobs" (
    "id" SERIAL NOT NULL,
    "tipe" VARCHAR(30) NOT NULL,
    "platform" VARCHAR(30) NOT NULL,
    "input_data" JSONB NOT NULL,
    "generated_text" TEXT,
    "status" "AiTaskStatus" NOT NULL DEFAULT 'pending',
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_jobs" (
    "id" SERIAL NOT NULL,
    "judul" VARCHAR(200) NOT NULL,
    "script" TEXT NOT NULL,
    "video_url" TEXT,
    "status" "AiTaskStatus" NOT NULL DEFAULT 'pending',
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_events" (
    "id" SERIAL NOT NULL,
    "nama_event" VARCHAR(200) NOT NULL,
    "jenis_event" VARCHAR(30) NOT NULL,
    "tanggal_pemilihan" DATE NOT NULL,
    "kecamatan_id" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'persiapan',
    "kontestan" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "election_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tps" (
    "id" SERIAL NOT NULL,
    "kode_tps" VARCHAR(20) NOT NULL,
    "election_id" INTEGER NOT NULL,
    "rt_id" INTEGER,
    "kelurahan_id" INTEGER,
    "kecamatan_id" INTEGER,
    "alamat" TEXT,
    "jumlah_dpt" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tps_results" (
    "id" SERIAL NOT NULL,
    "tps_id" INTEGER NOT NULL,
    "election_id" INTEGER NOT NULL,
    "jumlah_pengguna" INTEGER NOT NULL DEFAULT 0,
    "suara_sah" INTEGER NOT NULL DEFAULT 0,
    "suara_tidak_sah" INTEGER NOT NULL DEFAULT 0,
    "hasil_suara" JSONB NOT NULL DEFAULT '{}',
    "bukti_foto_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "input_by" INTEGER,
    "verified_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tps_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_officials" (
    "id" SERIAL NOT NULL,
    "nama_lengkap" VARCHAR(200) NOT NULL,
    "gelar_depan" VARCHAR(50),
    "gelar_belakang" VARCHAR(100),
    "official_photo_url" TEXT,
    "jabatan" VARCHAR(200) NOT NULL,
    "lembaga" VARCHAR(200) NOT NULL,
    "fraksi" VARCHAR(100),
    "partai" VARCHAR(100),
    "komisi" VARCHAR(100),
    "dapil" VARCHAR(200),
    "periode" VARCHAR(50),
    "fokus_komisi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wa_aspirasi" VARCHAR(20),
    "instagram" VARCHAR(100),
    "bio_singkat" TEXT,
    "visi" TEXT,
    "misi" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_officials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_aspirasi" (
    "id" SERIAL NOT NULL,
    "official_id" INTEGER NOT NULL,
    "nama_pelapor" VARCHAR(150),
    "noHp" VARCHAR(20),
    "wilayah" VARCHAR(200),
    "judul_aspirasi" VARCHAR(300) NOT NULL,
    "isi_aspirasi" TEXT NOT NULL,
    "kategori" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'diterima',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_aspirasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_kecamatan_id_idx" ON "users"("kecamatan_id");

-- CreateIndex
CREATE INDEX "users_kelurahan_id_idx" ON "users"("kelurahan_id");

-- CreateIndex
CREATE INDEX "users_rw_id_idx" ON "users"("rw_id");

-- CreateIndex
CREATE INDEX "users_rt_id_idx" ON "users"("rt_id");

-- CreateIndex
CREATE INDEX "users_warmindo_id_idx" ON "users"("warmindo_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "provinsi_nama_key" ON "provinsi"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "provinsi_kode_key" ON "provinsi"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "kota_kode_key" ON "kota"("kode");

-- CreateIndex
CREATE INDEX "kota_provinsi_id_idx" ON "kota"("provinsi_id");

-- CreateIndex
CREATE UNIQUE INDEX "kota_provinsi_id_nama_key" ON "kota"("provinsi_id", "nama");

-- CreateIndex
CREATE INDEX "kecamatan_kota_id_idx" ON "kecamatan"("kota_id");

-- CreateIndex
CREATE UNIQUE INDEX "kecamatan_kota_id_nama_key" ON "kecamatan"("kota_id", "nama");

-- CreateIndex
CREATE INDEX "kelurahan_kecamatan_id_idx" ON "kelurahan"("kecamatan_id");

-- CreateIndex
CREATE UNIQUE INDEX "kelurahan_kecamatan_id_nama_key" ON "kelurahan"("kecamatan_id", "nama");

-- CreateIndex
CREATE INDEX "rw_kelurahan_id_idx" ON "rw"("kelurahan_id");

-- CreateIndex
CREATE UNIQUE INDEX "rw_kelurahan_id_nomor_key" ON "rw"("kelurahan_id", "nomor");

-- CreateIndex
CREATE INDEX "rt_rw_id_idx" ON "rt"("rw_id");

-- CreateIndex
CREATE UNIQUE INDEX "rt_rw_id_nomor_key" ON "rt"("rw_id", "nomor");

-- CreateIndex
CREATE UNIQUE INDEX "warga_uuid_key" ON "warga"("uuid");

-- CreateIndex
CREATE INDEX "warga_rt_id_idx" ON "warga"("rt_id");

-- CreateIndex
CREATE INDEX "warga_kk_id_idx" ON "warga"("kk_id");

-- CreateIndex
CREATE INDEX "warga_created_by_idx" ON "warga"("created_by");

-- CreateIndex
CREATE INDEX "warga_nik_hash_idx" ON "warga"("nik_hash");

-- CreateIndex
CREATE INDEX "warga_nama_idx" ON "warga"("nama");

-- CreateIndex
CREATE INDEX "warga_deleted_at_idx" ON "warga"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "keluarga_no_kk_key" ON "keluarga"("no_kk");

-- CreateIndex
CREATE INDEX "keluarga_rt_id_idx" ON "keluarga"("rt_id");

-- CreateIndex
CREATE INDEX "keluarga_skor_prioritas_bantuan_idx" ON "keluarga"("skor_prioritas_bantuan" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "umkm_uuid_key" ON "umkm"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "umkm_kode_umkm_key" ON "umkm"("kode_umkm");

-- CreateIndex
CREATE INDEX "umkm_status_idx" ON "umkm"("status");

-- CreateIndex
CREATE INDEX "umkm_kategori_idx" ON "umkm"("kategori");

-- CreateIndex
CREATE INDEX "umkm_aktif_idx" ON "umkm"("aktif");

-- CreateIndex
CREATE INDEX "umkm_rt_id_idx" ON "umkm"("rt_id");

-- CreateIndex
CREATE INDEX "umkm_kelurahan_id_idx" ON "umkm"("kelurahan_id");

-- CreateIndex
CREATE INDEX "umkm_warga_id_idx" ON "umkm"("warga_id");

-- CreateIndex
CREATE INDEX "umkm_created_by_idx" ON "umkm"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "laporan_warga_kode_laporan_key" ON "laporan_warga"("kode_laporan");

-- CreateIndex
CREATE INDEX "laporan_warga_status_idx" ON "laporan_warga"("status");

-- CreateIndex
CREATE INDEX "laporan_warga_urgency_level_idx" ON "laporan_warga"("urgency_level");

-- CreateIndex
CREATE INDEX "laporan_warga_status_urgency_level_idx" ON "laporan_warga"("status", "urgency_level");

-- CreateIndex
CREATE INDEX "laporan_warga_is_emergency_idx" ON "laporan_warga"("is_emergency");

-- CreateIndex
CREATE INDEX "laporan_warga_rt_id_idx" ON "laporan_warga"("rt_id");

-- CreateIndex
CREATE INDEX "laporan_warga_kelurahan_id_idx" ON "laporan_warga"("kelurahan_id");

-- CreateIndex
CREATE INDEX "laporan_warga_kecamatan_id_idx" ON "laporan_warga"("kecamatan_id");

-- CreateIndex
CREATE INDEX "laporan_warga_assigned_to_idx" ON "laporan_warga"("assigned_to");

-- CreateIndex
CREATE INDEX "laporan_warga_created_by_idx" ON "laporan_warga"("created_by");

-- CreateIndex
CREATE INDEX "laporan_warga_created_at_idx" ON "laporan_warga"("created_at" DESC);

-- CreateIndex
CREATE INDEX "laporan_messages_laporan_id_idx" ON "laporan_messages"("laporan_id");

-- CreateIndex
CREATE UNIQUE INDEX "operational_alerts_uuid_key" ON "operational_alerts"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "operational_alerts_kode_alert_key" ON "operational_alerts"("kode_alert");

-- CreateIndex
CREATE INDEX "operational_alerts_status_idx" ON "operational_alerts"("status");

-- CreateIndex
CREATE INDEX "operational_alerts_severity_idx" ON "operational_alerts"("severity");

-- CreateIndex
CREATE INDEX "operational_alerts_kategori_idx" ON "operational_alerts"("kategori");

-- CreateIndex
CREATE INDEX "operational_alerts_entity_type_entity_id_idx" ON "operational_alerts"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "operational_alerts_wilayah_level_wilayah_id_idx" ON "operational_alerts"("wilayah_level", "wilayah_id");

-- CreateIndex
CREATE INDEX "operational_alerts_created_at_idx" ON "operational_alerts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "operational_alerts_created_by_idx" ON "operational_alerts"("created_by");

-- CreateIndex
CREATE INDEX "operational_alerts_acknowledged_by_idx" ON "operational_alerts"("acknowledged_by");

-- CreateIndex
CREATE INDEX "operational_alerts_resolved_by_idx" ON "operational_alerts"("resolved_by");

-- CreateIndex
CREATE INDEX "bantuan_aktif_idx" ON "bantuan"("aktif");

-- CreateIndex
CREATE INDEX "bantuan_penerima_bantuan_id_idx" ON "bantuan_penerima"("bantuan_id");

-- CreateIndex
CREATE INDEX "bantuan_penerima_keluarga_id_idx" ON "bantuan_penerima"("keluarga_id");

-- CreateIndex
CREATE INDEX "bantuan_penerima_rt_id_idx" ON "bantuan_penerima"("rt_id");

-- CreateIndex
CREATE INDEX "bantuan_penerima_status_idx" ON "bantuan_penerima"("status");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_outlet_kode_outlet_key" ON "warmindo_outlet"("kode_outlet");

-- CreateIndex
CREATE INDEX "warmindo_outlet_status_idx" ON "warmindo_outlet"("status");

-- CreateIndex
CREATE INDEX "warmindo_outlet_aktif_idx" ON "warmindo_outlet"("aktif");

-- CreateIndex
CREATE INDEX "warmindo_outlet_kelurahan_id_idx" ON "warmindo_outlet"("kelurahan_id");

-- CreateIndex
CREATE INDEX "warmindo_outlet_rt_id_idx" ON "warmindo_outlet"("rt_id");

-- CreateIndex
CREATE INDEX "warmindo_outlet_manager_user_id_idx" ON "warmindo_outlet"("manager_user_id");

-- CreateIndex
CREATE INDEX "warmindo_inventory_warmindo_id_idx" ON "warmindo_inventory"("warmindo_id");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_inventory_warmindo_id_nama_bahan_key" ON "warmindo_inventory"("warmindo_id", "nama_bahan");

-- CreateIndex
CREATE INDEX "warmindo_transaksi_warmindo_id_tanggal_idx" ON "warmindo_transaksi"("warmindo_id", "tanggal" DESC);

-- CreateIndex
CREATE INDEX "warmindo_transaksi_tanggal_idx" ON "warmindo_transaksi"("tanggal" DESC);

-- CreateIndex
CREATE INDEX "warmindo_pengeluaran_warmindo_id_tanggal_idx" ON "warmindo_pengeluaran"("warmindo_id", "tanggal" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "files_uuid_key" ON "files"("uuid");

-- CreateIndex
CREATE INDEX "files_entity_type_entity_id_idx" ON "files"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "files_uploaded_by_idx" ON "files"("uploaded_by");

-- CreateIndex
CREATE INDEX "ai_tasks_status_idx" ON "ai_tasks"("status");

-- CreateIndex
CREATE INDEX "ai_tasks_created_by_idx" ON "ai_tasks"("created_by");

-- CreateIndex
CREATE INDEX "ai_tasks_created_at_idx" ON "ai_tasks"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_reports_created_at_idx" ON "ai_reports"("created_at" DESC);

-- CreateIndex
CREATE INDEX "design_jobs_status_idx" ON "design_jobs"("status");

-- CreateIndex
CREATE INDEX "design_jobs_created_by_idx" ON "design_jobs"("created_by");

-- CreateIndex
CREATE INDEX "video_jobs_status_idx" ON "video_jobs"("status");

-- CreateIndex
CREATE INDEX "video_jobs_created_by_idx" ON "video_jobs"("created_by");

-- CreateIndex
CREATE INDEX "election_events_kecamatan_id_idx" ON "election_events"("kecamatan_id");

-- CreateIndex
CREATE INDEX "election_events_status_idx" ON "election_events"("status");

-- CreateIndex
CREATE INDEX "tps_election_id_idx" ON "tps"("election_id");

-- CreateIndex
CREATE INDEX "tps_rt_id_idx" ON "tps"("rt_id");

-- CreateIndex
CREATE INDEX "tps_kelurahan_id_idx" ON "tps"("kelurahan_id");

-- CreateIndex
CREATE INDEX "tps_kecamatan_id_idx" ON "tps"("kecamatan_id");

-- CreateIndex
CREATE UNIQUE INDEX "tps_election_id_kode_tps_key" ON "tps"("election_id", "kode_tps");

-- CreateIndex
CREATE INDEX "tps_results_election_id_idx" ON "tps_results"("election_id");

-- CreateIndex
CREATE INDEX "tps_results_input_by_idx" ON "tps_results"("input_by");

-- CreateIndex
CREATE INDEX "tps_results_verified_by_idx" ON "tps_results"("verified_by");

-- CreateIndex
CREATE INDEX "tps_results_status_idx" ON "tps_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tps_results_tps_id_election_id_key" ON "tps_results"("tps_id", "election_id");

-- CreateIndex
CREATE INDEX "public_officials_aktif_idx" ON "public_officials"("aktif");

-- CreateIndex
CREATE INDEX "public_officials_lembaga_idx" ON "public_officials"("lembaga");

-- CreateIndex
CREATE INDEX "official_aspirasi_official_id_idx" ON "official_aspirasi"("official_id");

-- CreateIndex
CREATE INDEX "official_aspirasi_status_idx" ON "official_aspirasi"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_kecamatan_id_fkey" FOREIGN KEY ("kecamatan_id") REFERENCES "kecamatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_kelurahan_id_fkey" FOREIGN KEY ("kelurahan_id") REFERENCES "kelurahan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_rw_id_fkey" FOREIGN KEY ("rw_id") REFERENCES "rw"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_warmindo_id_fkey" FOREIGN KEY ("warmindo_id") REFERENCES "warmindo_outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kota" ADD CONSTRAINT "kota_provinsi_id_fkey" FOREIGN KEY ("provinsi_id") REFERENCES "provinsi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kecamatan" ADD CONSTRAINT "kecamatan_kota_id_fkey" FOREIGN KEY ("kota_id") REFERENCES "kota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelurahan" ADD CONSTRAINT "kelurahan_kecamatan_id_fkey" FOREIGN KEY ("kecamatan_id") REFERENCES "kecamatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rw" ADD CONSTRAINT "rw_kelurahan_id_fkey" FOREIGN KEY ("kelurahan_id") REFERENCES "kelurahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rt" ADD CONSTRAINT "rt_rw_id_fkey" FOREIGN KEY ("rw_id") REFERENCES "rw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warga" ADD CONSTRAINT "warga_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warga" ADD CONSTRAINT "warga_kk_id_fkey" FOREIGN KEY ("kk_id") REFERENCES "keluarga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warga" ADD CONSTRAINT "warga_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keluarga" ADD CONSTRAINT "keluarga_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umkm" ADD CONSTRAINT "umkm_warga_id_fkey" FOREIGN KEY ("warga_id") REFERENCES "warga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umkm" ADD CONSTRAINT "umkm_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umkm" ADD CONSTRAINT "umkm_kelurahan_id_fkey" FOREIGN KEY ("kelurahan_id") REFERENCES "kelurahan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "umkm" ADD CONSTRAINT "umkm_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_warga" ADD CONSTRAINT "laporan_warga_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_warga" ADD CONSTRAINT "laporan_warga_kelurahan_id_fkey" FOREIGN KEY ("kelurahan_id") REFERENCES "kelurahan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_warga" ADD CONSTRAINT "laporan_warga_kecamatan_id_fkey" FOREIGN KEY ("kecamatan_id") REFERENCES "kecamatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_warga" ADD CONSTRAINT "laporan_warga_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_warga" ADD CONSTRAINT "laporan_warga_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_messages" ADD CONSTRAINT "laporan_messages_laporan_id_fkey" FOREIGN KEY ("laporan_id") REFERENCES "laporan_warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bantuan_penerima" ADD CONSTRAINT "bantuan_penerima_bantuan_id_fkey" FOREIGN KEY ("bantuan_id") REFERENCES "bantuan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bantuan_penerima" ADD CONSTRAINT "bantuan_penerima_keluarga_id_fkey" FOREIGN KEY ("keluarga_id") REFERENCES "keluarga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bantuan_penerima" ADD CONSTRAINT "bantuan_penerima_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warmindo_outlet" ADD CONSTRAINT "warmindo_outlet_kelurahan_id_fkey" FOREIGN KEY ("kelurahan_id") REFERENCES "kelurahan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warmindo_outlet" ADD CONSTRAINT "warmindo_outlet_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warmindo_outlet" ADD CONSTRAINT "warmindo_outlet_manager_user_id_fkey" FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warmindo_inventory" ADD CONSTRAINT "warmindo_inventory_warmindo_id_fkey" FOREIGN KEY ("warmindo_id") REFERENCES "warmindo_outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warmindo_transaksi" ADD CONSTRAINT "warmindo_transaksi_warmindo_id_fkey" FOREIGN KEY ("warmindo_id") REFERENCES "warmindo_outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warmindo_pengeluaran" ADD CONSTRAINT "warmindo_pengeluaran_warmindo_id_fkey" FOREIGN KEY ("warmindo_id") REFERENCES "warmindo_outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_jobs" ADD CONSTRAINT "design_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_events" ADD CONSTRAINT "election_events_kecamatan_id_fkey" FOREIGN KEY ("kecamatan_id") REFERENCES "kecamatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tps" ADD CONSTRAINT "tps_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "election_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tps" ADD CONSTRAINT "tps_rt_id_fkey" FOREIGN KEY ("rt_id") REFERENCES "rt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tps" ADD CONSTRAINT "tps_kelurahan_id_fkey" FOREIGN KEY ("kelurahan_id") REFERENCES "kelurahan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tps" ADD CONSTRAINT "tps_kecamatan_id_fkey" FOREIGN KEY ("kecamatan_id") REFERENCES "kecamatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tps_results" ADD CONSTRAINT "tps_results_tps_id_fkey" FOREIGN KEY ("tps_id") REFERENCES "tps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tps_results" ADD CONSTRAINT "tps_results_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "election_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tps_results" ADD CONSTRAINT "tps_results_input_by_fkey" FOREIGN KEY ("input_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tps_results" ADD CONSTRAINT "tps_results_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_aspirasi" ADD CONSTRAINT "official_aspirasi_official_id_fkey" FOREIGN KEY ("official_id") REFERENCES "public_officials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
