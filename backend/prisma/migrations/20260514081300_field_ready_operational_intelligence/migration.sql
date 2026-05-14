-- CreateTable
CREATE TABLE "territorial_social_profiles" (
    "id" SERIAL NOT NULL,
    "kode_profile" VARCHAR(40) NOT NULL,
    "wilayah_level" VARCHAR(20) NOT NULL,
    "wilayah_id" INTEGER NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "density_level" VARCHAR(30) NOT NULL,
    "poverty_risk" VARCHAR(30) NOT NULL,
    "active_status" VARCHAR(30) NOT NULL,
    "vulnerable_families" INTEGER NOT NULL DEFAULT 0,
    "elderly_count" INTEGER NOT NULL DEFAULT 0,
    "children_count" INTEGER NOT NULL DEFAULT 0,
    "disability_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territorial_social_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "territorial_economic_snapshots" (
    "id" SERIAL NOT NULL,
    "kode_snapshot" VARCHAR(40) NOT NULL,
    "wilayah_level" VARCHAR(20) NOT NULL,
    "wilayah_id" INTEGER NOT NULL,
    "unemployment_rate" DOUBLE PRECISION NOT NULL,
    "avg_income" DOUBLE PRECISION NOT NULL,
    "umkm_count" INTEGER NOT NULL DEFAULT 0,
    "informal_worker_rate" DOUBLE PRECISION NOT NULL,
    "economic_stress_score" DOUBLE PRECISION NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territorial_economic_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_security_snapshots" (
    "id" SERIAL NOT NULL,
    "kode_snapshot" VARCHAR(40) NOT NULL,
    "wilayah_level" VARCHAR(20) NOT NULL,
    "wilayah_id" INTEGER NOT NULL,
    "food_risk_score" DOUBLE PRECISION NOT NULL,
    "meal_gap_families" INTEGER NOT NULL DEFAULT 0,
    "staple_price_index" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_security_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "territorial_stress_signals" (
    "id" SERIAL NOT NULL,
    "kode_signal" VARCHAR(40) NOT NULL,
    "wilayah_level" VARCHAR(20) NOT NULL,
    "wilayah_id" INTEGER NOT NULL,
    "signal_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territorial_stress_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disaster_events" (
    "id" SERIAL NOT NULL,
    "kode_event" VARCHAR(40) NOT NULL,
    "wilayah_level" VARCHAR(20) NOT NULL,
    "wilayah_id" INTEGER NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "affected_families" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'active',
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disaster_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_responses" (
    "id" SERIAL NOT NULL,
    "kode_response" VARCHAR(40) NOT NULL,
    "event_id" INTEGER,
    "laporan_id" INTEGER,
    "wilayah_level" VARCHAR(20) NOT NULL,
    "wilayah_id" INTEGER NOT NULL,
    "response_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "response_delay_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bantuan_fairness_snapshots" (
    "id" SERIAL NOT NULL,
    "kode_snapshot" VARCHAR(40) NOT NULL,
    "wilayah_level" VARCHAR(20) NOT NULL,
    "wilayah_id" INTEGER,
    "fairness_score" DOUBLE PRECISION NOT NULL,
    "repeated_recipients" INTEGER NOT NULL DEFAULT 0,
    "uncovered_high_risk" INTEGER NOT NULL DEFAULT 0,
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "total_high_risk" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bantuan_fairness_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bantuan_anomalies" (
    "id" SERIAL NOT NULL,
    "kode_anomaly" VARCHAR(40) NOT NULL,
    "tipe" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "keluarga_id" INTEGER,
    "bantuan_id" INTEGER,
    "rt_id" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bantuan_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_suppliers" (
    "id" SERIAL NOT NULL,
    "kode_supplier" VARCHAR(30) NOT NULL,
    "nama" VARCHAR(200) NOT NULL,
    "kategori" VARCHAR(50) NOT NULL,
    "no_hp" VARCHAR(20),
    "alamat" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_products" (
    "id" SERIAL NOT NULL,
    "kode_product" VARCHAR(40) NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "nama" VARCHAR(200) NOT NULL,
    "kategori" VARCHAR(50) NOT NULL,
    "harga_jual" DOUBLE PRECISION NOT NULL,
    "hpp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "is_best_seller" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_sale_line_items" (
    "id" SERIAL NOT NULL,
    "transaksi_id" INTEGER NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "product_name" VARCHAR(200) NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "unit_hpp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "gross_profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warmindo_sale_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_procurements" (
    "id" SERIAL NOT NULL,
    "kode_procurement" VARCHAR(40) NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "supplier_id" INTEGER,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(30) NOT NULL DEFAULT 'received',
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_status" VARCHAR(30) NOT NULL DEFAULT 'paid',
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_procurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_procurement_items" (
    "id" SERIAL NOT NULL,
    "procurement_id" INTEGER NOT NULL,
    "inventory_name" VARCHAR(200) NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "satuan" VARCHAR(20) NOT NULL,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warmindo_procurement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_stock_movements" (
    "id" SERIAL NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "inventory_id" INTEGER,
    "nama_bahan" VARCHAR(200) NOT NULL,
    "movement_type" VARCHAR(20) NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "satuan" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" INTEGER,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warmindo_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_cashflow_ledger" (
    "id" SERIAL NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" VARCHAR(10) NOT NULL,
    "kategori" VARCHAR(50) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warmindo_cashflow_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_daily_closings" (
    "id" SERIAL NOT NULL,
    "kode_closing" VARCHAR(40) NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "tanggal" DATE NOT NULL,
    "total_sales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cash_expected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cash_actual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'closed',
    "closed_by" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_daily_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_employees" (
    "id" SERIAL NOT NULL,
    "kode_employee" VARCHAR(40) NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "nama" VARCHAR(150) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "no_hp" VARCHAR(20),
    "gaji_pokok" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_shifts" (
    "id" SERIAL NOT NULL,
    "kode_shift" VARCHAR(40) NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "tanggal" DATE NOT NULL,
    "shift_name" VARCHAR(50) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_attendance" (
    "id" SERIAL NOT NULL,
    "kode_attendance" VARCHAR(40) NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "shift_id" INTEGER,
    "tanggal" DATE NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "status" VARCHAR(30) NOT NULL DEFAULT 'present',
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_payroll" (
    "id" SERIAL NOT NULL,
    "kode_payroll" VARCHAR(40) NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "periode" VARCHAR(20) NOT NULL,
    "base_salary" DOUBLE PRECISION NOT NULL,
    "bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_salary" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'paid',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_assets" (
    "id" SERIAL NOT NULL,
    "kode_asset" VARCHAR(40) NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "nama_asset" VARCHAR(150) NOT NULL,
    "kategori" VARCHAR(50) NOT NULL,
    "kondisi" VARCHAR(30) NOT NULL DEFAULT 'baik',
    "nilai_beli" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tanggal_beli" DATE,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmindo_maintenance" (
    "id" SERIAL NOT NULL,
    "kode_maintenance" VARCHAR(40) NOT NULL,
    "warmindo_id" INTEGER NOT NULL,
    "asset_id" INTEGER,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issue" VARCHAR(300) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(30) NOT NULL DEFAULT 'open',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resolved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmindo_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_observations" (
    "id" SERIAL NOT NULL,
    "kode_observation" VARCHAR(40) NOT NULL,
    "domain" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "wilayah_level" VARCHAR(20),
    "wilayah_id" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_hypotheses" (
    "id" SERIAL NOT NULL,
    "kode_hypothesis" VARCHAR(40) NOT NULL,
    "observation_id" INTEGER,
    "statement" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "supporting_data" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(30) NOT NULL DEFAULT 'testing',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_hypotheses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" SERIAL NOT NULL,
    "kode_recommendation" VARCHAR(40) NOT NULL,
    "observation_id" INTEGER,
    "hypothesis_id" INTEGER,
    "domain" VARCHAR(50) NOT NULL,
    "recommendation" TEXT NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium',
    "expected_impact" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'proposed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "human_decisions" (
    "id" SERIAL NOT NULL,
    "kode_decision" VARCHAR(40) NOT NULL,
    "recommendation_id" INTEGER,
    "decided_by" INTEGER,
    "decision" VARCHAR(30) NOT NULL,
    "reason" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "human_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcome_tracking" (
    "id" SERIAL NOT NULL,
    "kode_outcome" VARCHAR(40) NOT NULL,
    "recommendation_id" INTEGER,
    "decision_id" INTEGER,
    "metric_name" VARCHAR(100) NOT NULL,
    "baseline_value" DOUBLE PRECISION,
    "current_value" DOUBLE PRECISION,
    "target_value" DOUBLE PRECISION,
    "status" VARCHAR(30) NOT NULL DEFAULT 'tracking',
    "notes" TEXT,
    "measured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outcome_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_learning_memory" (
    "id" SERIAL NOT NULL,
    "kode_memory" VARCHAR(40) NOT NULL,
    "domain" VARCHAR(50) NOT NULL,
    "lesson" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_learning_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_failure_memory" (
    "id" SERIAL NOT NULL,
    "kode_failure" VARCHAR(40) NOT NULL,
    "domain" VARCHAR(50) NOT NULL,
    "failed_recommendation" TEXT NOT NULL,
    "failure_reason" TEXT NOT NULL,
    "mitigation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_failure_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_causal_inferences" (
    "id" SERIAL NOT NULL,
    "kode_causal" VARCHAR(40) NOT NULL,
    "cause" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "domain" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_causal_inferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "territorial_social_profiles_kode_profile_key" ON "territorial_social_profiles"("kode_profile");

-- CreateIndex
CREATE INDEX "territorial_social_profiles_poverty_risk_idx" ON "territorial_social_profiles"("poverty_risk");

-- CreateIndex
CREATE INDEX "territorial_social_profiles_active_status_idx" ON "territorial_social_profiles"("active_status");

-- CreateIndex
CREATE UNIQUE INDEX "territorial_social_profiles_wilayah_level_wilayah_id_key" ON "territorial_social_profiles"("wilayah_level", "wilayah_id");

-- CreateIndex
CREATE UNIQUE INDEX "territorial_economic_snapshots_kode_snapshot_key" ON "territorial_economic_snapshots"("kode_snapshot");

-- CreateIndex
CREATE INDEX "territorial_economic_snapshots_wilayah_level_wilayah_id_idx" ON "territorial_economic_snapshots"("wilayah_level", "wilayah_id");

-- CreateIndex
CREATE INDEX "territorial_economic_snapshots_economic_stress_score_idx" ON "territorial_economic_snapshots"("economic_stress_score");

-- CreateIndex
CREATE UNIQUE INDEX "food_security_snapshots_kode_snapshot_key" ON "food_security_snapshots"("kode_snapshot");

-- CreateIndex
CREATE INDEX "food_security_snapshots_wilayah_level_wilayah_id_idx" ON "food_security_snapshots"("wilayah_level", "wilayah_id");

-- CreateIndex
CREATE INDEX "food_security_snapshots_food_risk_score_idx" ON "food_security_snapshots"("food_risk_score");

-- CreateIndex
CREATE UNIQUE INDEX "territorial_stress_signals_kode_signal_key" ON "territorial_stress_signals"("kode_signal");

-- CreateIndex
CREATE INDEX "territorial_stress_signals_wilayah_level_wilayah_id_idx" ON "territorial_stress_signals"("wilayah_level", "wilayah_id");

-- CreateIndex
CREATE INDEX "territorial_stress_signals_signal_type_idx" ON "territorial_stress_signals"("signal_type");

-- CreateIndex
CREATE INDEX "territorial_stress_signals_severity_idx" ON "territorial_stress_signals"("severity");

-- CreateIndex
CREATE INDEX "territorial_stress_signals_status_idx" ON "territorial_stress_signals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "disaster_events_kode_event_key" ON "disaster_events"("kode_event");

-- CreateIndex
CREATE INDEX "disaster_events_wilayah_level_wilayah_id_idx" ON "disaster_events"("wilayah_level", "wilayah_id");

-- CreateIndex
CREATE INDEX "disaster_events_event_type_idx" ON "disaster_events"("event_type");

-- CreateIndex
CREATE INDEX "disaster_events_severity_idx" ON "disaster_events"("severity");

-- CreateIndex
CREATE INDEX "disaster_events_status_idx" ON "disaster_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "government_responses_kode_response_key" ON "government_responses"("kode_response");

-- CreateIndex
CREATE INDEX "government_responses_event_id_idx" ON "government_responses"("event_id");

-- CreateIndex
CREATE INDEX "government_responses_laporan_id_idx" ON "government_responses"("laporan_id");

-- CreateIndex
CREATE INDEX "government_responses_wilayah_level_wilayah_id_idx" ON "government_responses"("wilayah_level", "wilayah_id");

-- CreateIndex
CREATE INDEX "government_responses_status_idx" ON "government_responses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bantuan_fairness_snapshots_kode_snapshot_key" ON "bantuan_fairness_snapshots"("kode_snapshot");

-- CreateIndex
CREATE INDEX "bantuan_fairness_snapshots_wilayah_level_wilayah_id_idx" ON "bantuan_fairness_snapshots"("wilayah_level", "wilayah_id");

-- CreateIndex
CREATE INDEX "bantuan_fairness_snapshots_fairness_score_idx" ON "bantuan_fairness_snapshots"("fairness_score");

-- CreateIndex
CREATE UNIQUE INDEX "bantuan_anomalies_kode_anomaly_key" ON "bantuan_anomalies"("kode_anomaly");

-- CreateIndex
CREATE INDEX "bantuan_anomalies_tipe_idx" ON "bantuan_anomalies"("tipe");

-- CreateIndex
CREATE INDEX "bantuan_anomalies_severity_idx" ON "bantuan_anomalies"("severity");

-- CreateIndex
CREATE INDEX "bantuan_anomalies_status_idx" ON "bantuan_anomalies"("status");

-- CreateIndex
CREATE INDEX "bantuan_anomalies_keluarga_id_idx" ON "bantuan_anomalies"("keluarga_id");

-- CreateIndex
CREATE INDEX "bantuan_anomalies_rt_id_idx" ON "bantuan_anomalies"("rt_id");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_suppliers_kode_supplier_key" ON "warmindo_suppliers"("kode_supplier");

-- CreateIndex
CREATE INDEX "warmindo_suppliers_aktif_idx" ON "warmindo_suppliers"("aktif");

-- CreateIndex
CREATE INDEX "warmindo_suppliers_kategori_idx" ON "warmindo_suppliers"("kategori");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_products_kode_product_key" ON "warmindo_products"("kode_product");

-- CreateIndex
CREATE INDEX "warmindo_products_warmindo_id_idx" ON "warmindo_products"("warmindo_id");

-- CreateIndex
CREATE INDEX "warmindo_products_kategori_idx" ON "warmindo_products"("kategori");

-- CreateIndex
CREATE INDEX "warmindo_products_aktif_idx" ON "warmindo_products"("aktif");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_products_warmindo_id_nama_key" ON "warmindo_products"("warmindo_id", "nama");

-- CreateIndex
CREATE INDEX "warmindo_sale_line_items_transaksi_id_idx" ON "warmindo_sale_line_items"("transaksi_id");

-- CreateIndex
CREATE INDEX "warmindo_sale_line_items_warmindo_id_idx" ON "warmindo_sale_line_items"("warmindo_id");

-- CreateIndex
CREATE INDEX "warmindo_sale_line_items_product_id_idx" ON "warmindo_sale_line_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_procurements_kode_procurement_key" ON "warmindo_procurements"("kode_procurement");

-- CreateIndex
CREATE INDEX "warmindo_procurements_warmindo_id_tanggal_idx" ON "warmindo_procurements"("warmindo_id", "tanggal" DESC);

-- CreateIndex
CREATE INDEX "warmindo_procurements_supplier_id_idx" ON "warmindo_procurements"("supplier_id");

-- CreateIndex
CREATE INDEX "warmindo_procurements_status_idx" ON "warmindo_procurements"("status");

-- CreateIndex
CREATE INDEX "warmindo_procurement_items_procurement_id_idx" ON "warmindo_procurement_items"("procurement_id");

-- CreateIndex
CREATE INDEX "warmindo_stock_movements_warmindo_id_tanggal_idx" ON "warmindo_stock_movements"("warmindo_id", "tanggal" DESC);

-- CreateIndex
CREATE INDEX "warmindo_stock_movements_inventory_id_idx" ON "warmindo_stock_movements"("inventory_id");

-- CreateIndex
CREATE INDEX "warmindo_stock_movements_movement_type_idx" ON "warmindo_stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "warmindo_cashflow_ledger_warmindo_id_tanggal_idx" ON "warmindo_cashflow_ledger"("warmindo_id", "tanggal" DESC);

-- CreateIndex
CREATE INDEX "warmindo_cashflow_ledger_direction_idx" ON "warmindo_cashflow_ledger"("direction");

-- CreateIndex
CREATE INDEX "warmindo_cashflow_ledger_kategori_idx" ON "warmindo_cashflow_ledger"("kategori");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_daily_closings_kode_closing_key" ON "warmindo_daily_closings"("kode_closing");

-- CreateIndex
CREATE INDEX "warmindo_daily_closings_status_idx" ON "warmindo_daily_closings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_daily_closings_warmindo_id_tanggal_key" ON "warmindo_daily_closings"("warmindo_id", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_employees_kode_employee_key" ON "warmindo_employees"("kode_employee");

-- CreateIndex
CREATE INDEX "warmindo_employees_warmindo_id_idx" ON "warmindo_employees"("warmindo_id");

-- CreateIndex
CREATE INDEX "warmindo_employees_aktif_idx" ON "warmindo_employees"("aktif");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_shifts_kode_shift_key" ON "warmindo_shifts"("kode_shift");

-- CreateIndex
CREATE INDEX "warmindo_shifts_warmindo_id_tanggal_idx" ON "warmindo_shifts"("warmindo_id", "tanggal");

-- CreateIndex
CREATE INDEX "warmindo_shifts_employee_id_idx" ON "warmindo_shifts"("employee_id");

-- CreateIndex
CREATE INDEX "warmindo_shifts_status_idx" ON "warmindo_shifts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_attendance_kode_attendance_key" ON "warmindo_attendance"("kode_attendance");

-- CreateIndex
CREATE INDEX "warmindo_attendance_warmindo_id_tanggal_idx" ON "warmindo_attendance"("warmindo_id", "tanggal");

-- CreateIndex
CREATE INDEX "warmindo_attendance_employee_id_idx" ON "warmindo_attendance"("employee_id");

-- CreateIndex
CREATE INDEX "warmindo_attendance_status_idx" ON "warmindo_attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_payroll_kode_payroll_key" ON "warmindo_payroll"("kode_payroll");

-- CreateIndex
CREATE INDEX "warmindo_payroll_warmindo_id_idx" ON "warmindo_payroll"("warmindo_id");

-- CreateIndex
CREATE INDEX "warmindo_payroll_employee_id_idx" ON "warmindo_payroll"("employee_id");

-- CreateIndex
CREATE INDEX "warmindo_payroll_periode_idx" ON "warmindo_payroll"("periode");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_assets_kode_asset_key" ON "warmindo_assets"("kode_asset");

-- CreateIndex
CREATE INDEX "warmindo_assets_warmindo_id_idx" ON "warmindo_assets"("warmindo_id");

-- CreateIndex
CREATE INDEX "warmindo_assets_kondisi_idx" ON "warmindo_assets"("kondisi");

-- CreateIndex
CREATE UNIQUE INDEX "warmindo_maintenance_kode_maintenance_key" ON "warmindo_maintenance"("kode_maintenance");

-- CreateIndex
CREATE INDEX "warmindo_maintenance_warmindo_id_tanggal_idx" ON "warmindo_maintenance"("warmindo_id", "tanggal" DESC);

-- CreateIndex
CREATE INDEX "warmindo_maintenance_asset_id_idx" ON "warmindo_maintenance"("asset_id");

-- CreateIndex
CREATE INDEX "warmindo_maintenance_status_idx" ON "warmindo_maintenance"("status");

-- CreateIndex
CREATE INDEX "warmindo_maintenance_severity_idx" ON "warmindo_maintenance"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "ai_observations_kode_observation_key" ON "ai_observations"("kode_observation");

-- CreateIndex
CREATE INDEX "ai_observations_domain_idx" ON "ai_observations"("domain");

-- CreateIndex
CREATE INDEX "ai_observations_severity_idx" ON "ai_observations"("severity");

-- CreateIndex
CREATE INDEX "ai_observations_status_idx" ON "ai_observations"("status");

-- CreateIndex
CREATE INDEX "ai_observations_wilayah_level_wilayah_id_idx" ON "ai_observations"("wilayah_level", "wilayah_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_hypotheses_kode_hypothesis_key" ON "ai_hypotheses"("kode_hypothesis");

-- CreateIndex
CREATE INDEX "ai_hypotheses_observation_id_idx" ON "ai_hypotheses"("observation_id");

-- CreateIndex
CREATE INDEX "ai_hypotheses_status_idx" ON "ai_hypotheses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_recommendations_kode_recommendation_key" ON "ai_recommendations"("kode_recommendation");

-- CreateIndex
CREATE INDEX "ai_recommendations_domain_idx" ON "ai_recommendations"("domain");

-- CreateIndex
CREATE INDEX "ai_recommendations_priority_idx" ON "ai_recommendations"("priority");

-- CreateIndex
CREATE INDEX "ai_recommendations_status_idx" ON "ai_recommendations"("status");

-- CreateIndex
CREATE INDEX "ai_recommendations_observation_id_idx" ON "ai_recommendations"("observation_id");

-- CreateIndex
CREATE INDEX "ai_recommendations_hypothesis_id_idx" ON "ai_recommendations"("hypothesis_id");

-- CreateIndex
CREATE UNIQUE INDEX "human_decisions_kode_decision_key" ON "human_decisions"("kode_decision");

-- CreateIndex
CREATE INDEX "human_decisions_recommendation_id_idx" ON "human_decisions"("recommendation_id");

-- CreateIndex
CREATE INDEX "human_decisions_decision_idx" ON "human_decisions"("decision");

-- CreateIndex
CREATE INDEX "human_decisions_decided_by_idx" ON "human_decisions"("decided_by");

-- CreateIndex
CREATE UNIQUE INDEX "outcome_tracking_kode_outcome_key" ON "outcome_tracking"("kode_outcome");

-- CreateIndex
CREATE INDEX "outcome_tracking_recommendation_id_idx" ON "outcome_tracking"("recommendation_id");

-- CreateIndex
CREATE INDEX "outcome_tracking_decision_id_idx" ON "outcome_tracking"("decision_id");

-- CreateIndex
CREATE INDEX "outcome_tracking_status_idx" ON "outcome_tracking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_learning_memory_kode_memory_key" ON "ai_learning_memory"("kode_memory");

-- CreateIndex
CREATE INDEX "ai_learning_memory_domain_idx" ON "ai_learning_memory"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "ai_failure_memory_kode_failure_key" ON "ai_failure_memory"("kode_failure");

-- CreateIndex
CREATE INDEX "ai_failure_memory_domain_idx" ON "ai_failure_memory"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "ai_causal_inferences_kode_causal_key" ON "ai_causal_inferences"("kode_causal");

-- CreateIndex
CREATE INDEX "ai_causal_inferences_domain_idx" ON "ai_causal_inferences"("domain");

-- CreateIndex
CREATE INDEX "ai_causal_inferences_confidence_idx" ON "ai_causal_inferences"("confidence");
