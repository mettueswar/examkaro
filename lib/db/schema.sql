-- ExamKaro Database Schema
-- Run: node scripts/migrate.js

CREATE DATABASE IF NOT EXISTS examkaro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE examkaro;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uid VARCHAR(128) UNIQUE NOT NULL COMMENT 'Firebase UID',
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar VARCHAR(512),
  role ENUM('user', 'admin', 'moderator') DEFAULT 'user',
  plan ENUM('free', 'premium') DEFAULT 'free',
  plan_expiry DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_uid (uid),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  name_hindi VARCHAR(255),
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  parent_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_parent (parent_id)
) ENGINE=InnoDB;

-- Mock Tests
CREATE TABLE IF NOT EXISTS mock_tests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(500) NOT NULL,
  title_hindi VARCHAR(500),
  slug VARCHAR(500) UNIQUE NOT NULL,
  description TEXT,
  category_id INT NOT NULL,
  type ENUM('free', 'premium') DEFAULT 'free',
  language ENUM('hindi', 'english', 'both') DEFAULT 'both',
  duration INT NOT NULL COMMENT 'minutes',
  total_questions INT DEFAULT 0,
  total_marks DECIMAL(6,2) DEFAULT 0,
  negative_marking DECIMAL(4,2) DEFAULT 0.25,
  passing_marks DECIMAL(6,2),
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  instructions LONGTEXT,
  instructions_hindi LONGTEXT,
  is_active BOOLEAN DEFAULT TRUE,
  attempt_count INT DEFAULT 0,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_slug (slug),
  INDEX idx_category (category_id),
  INDEX idx_type (type),
  FULLTEXT idx_search (title, description)
) ENGINE=InnoDB;

-- Test Sections
CREATE TABLE IF NOT EXISTS test_sections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_hindi VARCHAR(255),
  question_count INT DEFAULT 0,
  time_limit INT COMMENT 'seconds, null = no limit',
  order_index INT DEFAULT 0,
  FOREIGN KEY (test_id) REFERENCES mock_tests(id) ON DELETE CASCADE,
  INDEX idx_test (test_id)
) ENGINE=InnoDB;

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_id INT NOT NULL,
  section_id INT,
  text LONGTEXT NOT NULL,
  text_hindi LONGTEXT,
  type ENUM('mcq', 'true_false', 'fill_blank') DEFAULT 'mcq',
  options JSON NOT NULL COMMENT 'Array of {id, text, textHindi, isCorrect, image}',
  explanation LONGTEXT,
  explanation_hindi LONGTEXT,
  image VARCHAR(512),
  marks DECIMAL(4,2) DEFAULT 1,
  negative_marks DECIMAL(4,2) DEFAULT 0.25,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  tags JSON,
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES mock_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES test_sections(id) ON DELETE SET NULL,
  INDEX idx_test (test_id),
  INDEX idx_section (section_id)
) ENGINE=InnoDB;

-- Test Attempts
CREATE TABLE IF NOT EXISTS test_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  test_id INT NOT NULL,
  answers JSON NOT NULL DEFAULT '{}' COMMENT 'Map<questionId, QuestionAttempt>',
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  submitted_at DATETIME,
  score DECIMAL(8,2),
  total_marks DECIMAL(8,2),
  correct INT DEFAULT 0,
  incorrect INT DEFAULT 0,
  skipped INT DEFAULT 0,
  time_taken INT COMMENT 'seconds',
  rank INT,
  percentile DECIMAL(5,2),
  status ENUM('in_progress', 'submitted', 'expired') DEFAULT 'in_progress',
  language ENUM('hindi', 'english') DEFAULT 'english',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (test_id) REFERENCES mock_tests(id),
  INDEX idx_user (user_id),
  INDEX idx_test (test_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_active_attempt (user_id, test_id, status)
) ENGINE=InnoDB;

-- Packages
CREATE TABLE IF NOT EXISTS packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2),
  validity_days INT DEFAULT 365,
  test_ids JSON NOT NULL DEFAULT '[]',
  category_ids JSON DEFAULT '[]',
  features JSON DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_slug (slug)
) ENGINE=InnoDB;

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  package_id INT,
  order_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'Razorpay order ID',
  payment_id VARCHAR(255) COMMENT 'Razorpay payment ID',
  signature VARCHAR(512),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (package_id) REFERENCES packages(id),
  INDEX idx_user (user_id),
  INDEX idx_order (order_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- User Packages (access control)
CREATE TABLE IF NOT EXISTS user_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  package_id INT NOT NULL,
  payment_id INT,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  INDEX idx_user (user_id),
  INDEX idx_expiry (valid_until)
) ENGINE=InnoDB;

-- News Articles
CREATE TABLE IF NOT EXISTS news_articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  content LONGTEXT NOT NULL,
  excerpt TEXT,
  featured_image VARCHAR(512),
  author_id INT NOT NULL,
  category_id INT,
  tags JSON DEFAULT '[]',
  published BOOLEAN DEFAULT FALSE,
  published_at DATETIME,
  view_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id),
  INDEX idx_slug (slug),
  INDEX idx_published (published, published_at),
  FULLTEXT idx_search (title, excerpt)
) ENGINE=InnoDB;

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  question_id INT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_bookmark (user_id, question_id)
) ENGINE=InnoDB;

-- Rate limit table (for custom rate limiting)
CREATE TABLE IF NOT EXISTS rate_limits (
  id VARCHAR(255) PRIMARY KEY,
  points INT DEFAULT 0,
  expire BIGINT,
  INDEX idx_expire (expire)
) ENGINE=InnoDB;

-- ─── Subscriptions (Super User AI access) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  plan ENUM('monthly', 'quarterly', 'yearly') NOT NULL,
  status ENUM('active', 'expired', 'cancelled', 'pending') DEFAULT 'pending',
  order_id VARCHAR(255) UNIQUE NOT NULL,
  payment_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  start_date DATETIME,
  end_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_status (user_id, status),
  INDEX idx_end_date (end_date)
) ENGINE=InnoDB;

-- ─── AI Sources (uploaded/linked content) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_sources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('pdf', 'docx', 'url', 'youtube', 'text') NOT NULL,
  title VARCHAR(500) NOT NULL,
  original_name VARCHAR(500),
  url VARCHAR(2048),
  content LONGTEXT NOT NULL,
  token_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ─── Flashcard Decks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  source_id INT,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  card_count INT DEFAULT 0,
  studied_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES ai_sources(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ─── Flashcards ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deck_id INT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  hint TEXT,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  last_studied DATETIME,
  times_correct INT DEFAULT 0,
  times_wrong INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  INDEX idx_deck (deck_id)
) ENGINE=InnoDB;

-- ─── AI Quizzes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  source_id INT,
  title VARCHAR(500) NOT NULL,
  questions JSON NOT NULL COMMENT 'Array of AIQuizQuestion',
  total_questions INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES ai_sources(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Add super_user role and is_super_user flag
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS super_user_expiry DATETIME;

-- ─── Super User Subscription Plans ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  billing ENUM('monthly', 'quarterly', 'yearly') NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2),
  features JSON NOT NULL DEFAULT '[]',
  ai_credits_per_month INT DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── User Subscriptions (Super Plan) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  order_id VARCHAR(255),
  payment_id VARCHAR(255),
  amount DECIMAL(10,2),
  status ENUM('active','expired','cancelled') DEFAULT 'active',
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  ai_credits_used INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  INDEX idx_user (user_id),
  INDEX idx_valid (valid_until)
) ENGINE=InnoDB;

-- ─── AI Source Documents ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_sources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  source_type ENUM('pdf','docx','url','youtube','text') NOT NULL,
  source_url VARCHAR(1000),
  file_path VARCHAR(512),
  extracted_text LONGTEXT,
  word_count INT DEFAULT 0,
  language VARCHAR(10) DEFAULT 'en',
  processed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ─── Flashcard Decks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  source_id INT,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  subject VARCHAR(255),
  language ENUM('english','hindi','both') DEFAULT 'english',
  card_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (source_id) REFERENCES ai_sources(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ─── Flashcards ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deck_id INT NOT NULL,
  front TEXT NOT NULL,
  front_hindi TEXT,
  back TEXT NOT NULL,
  back_hindi TEXT,
  hint TEXT,
  tags JSON DEFAULT '[]',
  difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
  times_reviewed INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  last_reviewed DATETIME,
  order_index INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  INDEX idx_deck (deck_id)
) ENGINE=InnoDB;

-- ─── AI Quizzes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  source_id INT,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  subject VARCHAR(255),
  difficulty ENUM('easy','medium','hard','mixed') DEFAULT 'mixed',
  question_count INT DEFAULT 0,
  duration_minutes INT DEFAULT 15,
  attempts INT DEFAULT 0,
  best_score DECIMAL(5,2),
  is_public BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (source_id) REFERENCES ai_sources(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ─── AI Quiz Questions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_quiz_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  question TEXT NOT NULL,
  question_hindi TEXT,
  options JSON NOT NULL,
  correct_option VARCHAR(1) NOT NULL,
  explanation TEXT,
  explanation_hindi TEXT,
  difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
  order_index INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES ai_quizzes(id) ON DELETE CASCADE,
  INDEX idx_quiz (quiz_id)
) ENGINE=InnoDB;

-- ─── AI Quiz Attempts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_quiz_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  user_id INT NOT NULL,
  answers JSON NOT NULL DEFAULT '{}',
  score DECIMAL(5,2),
  total_questions INT,
  correct INT DEFAULT 0,
  time_taken INT,
  completed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES ai_quizzes(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id),
  INDEX idx_quiz (quiz_id)
) ENGINE=InnoDB;

-- Update users table to support super plan
ALTER TABLE users MODIFY COLUMN plan ENUM('free','premium','super') DEFAULT 'free';

-- ─── AI Features Schema ───────────────────────────────────────────────────────

-- Extend users plan to include 'super'
ALTER TABLE users MODIFY COLUMN plan ENUM('free', 'premium', 'super') DEFAULT 'free';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS plan_type ENUM('free', 'premium', 'super') DEFAULT 'premium';
ALTER TABLE packages ADD COLUMN IF NOT EXISTS billing ENUM('monthly', 'quarterly', 'yearly') NULL;

-- Study Materials (uploaded files / links)
CREATE TABLE IF NOT EXISTS study_materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  source_type ENUM('pdf', 'docx', 'website', 'youtube', 'text') NOT NULL,
  source_url VARCHAR(1000),
  file_path VARCHAR(500),
  content LONGTEXT,
  summary TEXT,
  word_count INT DEFAULT 0,
  status ENUM('processing', 'ready', 'error') DEFAULT 'processing',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- Flashcard Decks
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  material_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  card_count INT DEFAULT 0,
  last_studied DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES study_materials(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Flashcards
CREATE TABLE IF NOT EXISTS flashcards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deck_id INT NOT NULL,
  front LONGTEXT NOT NULL,
  back LONGTEXT NOT NULL,
  hint TEXT,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  times_reviewed INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  next_review DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  INDEX idx_deck (deck_id),
  INDEX idx_review (next_review)
) ENGINE=InnoDB;

-- AI Quizzes
CREATE TABLE IF NOT EXISTS ai_quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  material_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  question_count INT DEFAULT 0,
  time_limit INT,
  questions JSON NOT NULL DEFAULT '[]',
  attempts INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES study_materials(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- AI Usage tracking (rate limiting per plan)
CREATE TABLE IF NOT EXISTS ai_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action ENUM('flashcard_gen', 'quiz_gen', 'summarize', 'translate') NOT NULL,
  tokens_used INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_month (user_id, created_at)
) ENGINE=InnoDB;

-- Add subject column to questions for subject-wise filtering in tests
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subject VARCHAR(100) NULL AFTER section_id;
ALTER TABLE questions ADD INDEX IF NOT EXISTS idx_subject (subject);
