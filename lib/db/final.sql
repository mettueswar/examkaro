-- =========================================================
-- ExamKaro FULL PRODUCTION SCHEMA (V4 FINAL)
-- =========================================================

CREATE DATABASE IF NOT EXISTS examkaro 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE examkaro;

-- =========================================================
-- USERS
-- =========================================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uid VARCHAR(128) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar VARCHAR(512),

  role ENUM('user','admin','moderator') DEFAULT 'user',

  plan ENUM('free','premium','super') DEFAULT 'free',
  plan_expiry DATETIME,

  is_super_user BOOLEAN DEFAULT FALSE,
  super_user_expiry DATETIME,

  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================================================
-- RATE LIMITS
-- =========================================================
CREATE TABLE rate_limits (
  id VARCHAR(255) PRIMARY KEY,
  points INT DEFAULT 0,
  expire BIGINT
) ENGINE=InnoDB;

-- =========================================================
-- CATEGORIES
-- =========================================================
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  name_hindi VARCHAR(255),
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  parent_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================
-- MOCK TESTS + SECTIONS
-- =========================================================
CREATE TABLE mock_tests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(500),
  title_hindi VARCHAR(500),
  slug VARCHAR(500) UNIQUE,
  description TEXT,
  category_id INT,

  type ENUM('free','premium') DEFAULT 'free',
  language ENUM('hindi','english','both') DEFAULT 'both',

  duration INT,
  total_questions INT DEFAULT 0,
  total_marks DECIMAL(6,2),
  negative_marking DECIMAL(4,2),
  passing_marks DECIMAL(6,2),

  difficulty ENUM('easy','medium','hard') DEFAULT 'medium',

  instructions LONGTEXT,
  instructions_hindi LONGTEXT,

  is_active BOOLEAN DEFAULT TRUE,
  attempt_count INT DEFAULT 0,

  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE test_sections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_id INT,
  name VARCHAR(255),
  name_hindi VARCHAR(255),
  question_count INT,
  time_limit INT,
  order_index INT,
  FOREIGN KEY (test_id) REFERENCES mock_tests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- QUESTIONS
-- =========================================================
CREATE TABLE questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_id INT,
  section_id INT,
  subject VARCHAR(100),

  text LONGTEXT,
  text_hindi LONGTEXT,

  type ENUM('mcq','true_false','fill_blank') DEFAULT 'mcq',

  options JSON,
  explanation LONGTEXT,
  explanation_hindi LONGTEXT,

  image VARCHAR(512),

  marks DECIMAL(4,2),
  negative_marks DECIMAL(4,2),

  difficulty ENUM('easy','medium','hard'),

  tags JSON,
  order_index INT,
  is_active BOOLEAN DEFAULT TRUE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (test_id) REFERENCES mock_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES test_sections(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================
-- TEST ATTEMPTS
-- =========================================================
CREATE TABLE test_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  test_id INT,

  answers JSON,

  start_time DATETIME,
  end_time DATETIME,
  submitted_at DATETIME,

  score DECIMAL(8,2),
  total_marks DECIMAL(8,2),

  correct INT DEFAULT 0,
  incorrect INT DEFAULT 0,
  skipped INT DEFAULT 0,

  time_taken INT,

  rank INT,
  percentile DECIMAL(5,2),

  status ENUM('in_progress','submitted','expired') DEFAULT 'in_progress',

  language ENUM('hindi','english'),

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (test_id) REFERENCES mock_tests(id)
) ENGINE=InnoDB;

-- =========================================================
-- BOOKMARKS
-- =========================================================
CREATE TABLE bookmarks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  question_id INT,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,

  UNIQUE KEY unique_bookmark (user_id, question_id)
) ENGINE=InnoDB;

-- =========================================================
-- NEWS
-- =========================================================
CREATE TABLE news_articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(500),
  slug VARCHAR(500) UNIQUE,
  content LONGTEXT,
  excerpt TEXT,
  featured_image VARCHAR(512),
  author_id INT,
  category_id INT,
  tags JSON,
  published BOOLEAN,
  published_at DATETIME,
  view_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================================================
-- PAYMENTS + PACKAGES
-- =========================================================
CREATE TABLE packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  slug VARCHAR(255) UNIQUE,
  description TEXT,

  price DECIMAL(10,2),
  discounted_price DECIMAL(10,2),

  validity_days INT,

  test_ids JSON,
  category_ids JSON,
  features JSON,

  plan_type ENUM('free','premium','super'),
  billing ENUM('monthly','quarterly','yearly'),

  mock_test_access_limit INT,

  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  package_id INT,
  order_id VARCHAR(255) UNIQUE,
  payment_id VARCHAR(255),
  signature VARCHAR(512),
  amount DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'INR',
  status ENUM('pending','success','failed','refunded'),
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (package_id) REFERENCES packages(id)
) ENGINE=InnoDB;

CREATE TABLE user_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  package_id INT,
  payment_id INT,
  valid_from DATETIME,
  valid_until DATETIME,
  is_active BOOLEAN,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
) ENGINE=InnoDB;

-- =========================================================
-- SUBSCRIPTIONS (AI SUPER PLAN)
-- =========================================================
CREATE TABLE subscription_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  slug VARCHAR(50) UNIQUE,
  billing ENUM('monthly','quarterly','yearly'),
  price DECIMAL(10,2),
  discounted_price DECIMAL(10,2),
  features JSON,
  ai_credits_per_month INT,
  is_active BOOLEAN,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE user_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  plan_id INT,
  order_id VARCHAR(255),
  payment_id VARCHAR(255),
  amount DECIMAL(10,2),
  status ENUM('active','expired','cancelled','pending'),
  valid_from DATETIME,
  valid_until DATETIME,
  ai_credits_used INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
) ENGINE=InnoDB;

-- =========================================================
-- STUDY MATERIALS
-- =========================================================
CREATE TABLE study_materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  title VARCHAR(500),
  source_type ENUM('pdf','docx','url','youtube','text'),
  source_url VARCHAR(1000),
  file_path VARCHAR(1000),
  original_name VARCHAR(500),

  content LONGTEXT,
  summary TEXT,

  word_count INT,
  token_count INT,

  language VARCHAR(10),

  status ENUM('pending','processing','ready','failed'),
  processed BOOLEAN,

  error_message TEXT,
  metadata JSON,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================================================
-- FLASHCARDS (SRS)
-- =========================================================
CREATE TABLE flashcard_decks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  material_id INT,
  title VARCHAR(500),
  description TEXT,
  subject VARCHAR(255),
  language ENUM('english','hindi','both'),
  card_count INT,
  studied_count INT,
  is_public BOOLEAN,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (material_id) REFERENCES study_materials(id)
) ENGINE=InnoDB;

CREATE TABLE flashcards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deck_id INT,

  front LONGTEXT,
  front_hindi LONGTEXT,

  back LONGTEXT,
  back_hindi LONGTEXT,

  hint TEXT,
  tags JSON,

  difficulty ENUM('easy','medium','hard'),

  order_index INT,

  ease_factor DECIMAL(4,2),
  interval_days INT,
  next_review DATETIME,

  times_reviewed INT,
  times_correct INT,
  times_wrong INT,

  last_reviewed DATETIME,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- AI QUIZZES
-- =========================================================
CREATE TABLE ai_quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  material_id INT,

  title VARCHAR(500),
  description TEXT,
  subject VARCHAR(255),

  difficulty ENUM('easy','medium','hard','mixed'),

  question_count INT,
  time_limit INT,

  attempts INT,
  best_score DECIMAL(5,2),

  is_public BOOLEAN,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (material_id) REFERENCES study_materials(id)
) ENGINE=InnoDB;

CREATE TABLE ai_quiz_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT,
  question TEXT,
  question_hindi TEXT,
  options JSON,
  correct_option VARCHAR(10),
  explanation TEXT,
  explanation_hindi TEXT,
  difficulty ENUM('easy','medium','hard'),
  order_index INT,
  FOREIGN KEY (quiz_id) REFERENCES ai_quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ai_quiz_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT,
  user_id INT,
  answers JSON,
  score DECIMAL(6,2),
  total INT,
  correct INT,
  incorrect INT,
  time_taken INT,
  completed BOOLEAN,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES ai_quizzes(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================================================
-- AI USAGE
-- =========================================================
CREATE TABLE ai_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action ENUM('flashcard_gen','quiz_gen','summarize','process_material','translate'),
  material_id INT,
  tokens_used INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;