-- AI Features Schema — append to schema.sql migrations

-- ─── Subscription Plans ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  billing ENUM('monthly', 'quarterly', 'yearly') NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2),
  features JSON DEFAULT '[]',
  ai_credits_per_month INT DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─── User Subscriptions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  payment_id INT,
  order_id VARCHAR(255),
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_expiry (valid_until)
) ENGINE=InnoDB;

-- ─── Study Materials (source files for AI) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS study_materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  type ENUM('pdf', 'docx', 'url', 'youtube', 'text') NOT NULL,
  source_url VARCHAR(1000),
  file_path VARCHAR(1000),
  content LONGTEXT COMMENT 'Extracted text content',
  word_count INT DEFAULT 0,
  status ENUM('pending', 'processing', 'ready', 'failed') DEFAULT 'pending',
  error_message TEXT,
  metadata JSON COMMENT 'Duration for YouTube, page count for PDF, etc.',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ─── Flashcard Decks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  material_id INT,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  card_count INT DEFAULT 0,
  language ENUM('english', 'hindi', 'both') DEFAULT 'english',
  is_public BOOLEAN DEFAULT FALSE,
  study_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES study_materials(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ─── Flashcards ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deck_id INT NOT NULL,
  front LONGTEXT NOT NULL COMMENT 'Question/term side',
  back LONGTEXT NOT NULL COMMENT 'Answer/definition side',
  front_hindi LONGTEXT,
  back_hindi LONGTEXT,
  hint TEXT,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  order_index INT DEFAULT 0,
  -- Spaced repetition fields
  ease_factor DECIMAL(4,2) DEFAULT 2.50,
  interval_days INT DEFAULT 1,
  next_review DATETIME,
  review_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  INDEX idx_deck (deck_id),
  INDEX idx_review (deck_id, next_review)
) ENGINE=InnoDB;

-- ─── AI Quizzes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  material_id INT,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  difficulty ENUM('easy', 'medium', 'hard', 'mixed') DEFAULT 'mixed',
  question_count INT DEFAULT 0,
  time_limit INT DEFAULT 0 COMMENT 'seconds, 0 = no limit',
  is_public BOOLEAN DEFAULT FALSE,
  attempt_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES study_materials(id) ON DELETE SET NULL,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ─── AI Quiz Questions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_quiz_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  question TEXT NOT NULL,
  question_hindi TEXT,
  options JSON NOT NULL COMMENT '[{id, text, textHindi, isCorrect}]',
  explanation TEXT,
  explanation_hindi TEXT,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  order_index INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES ai_quizzes(id) ON DELETE CASCADE,
  INDEX idx_quiz (quiz_id)
) ENGINE=InnoDB;

-- ─── AI Quiz Attempts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_quiz_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  user_id INT NOT NULL,
  answers JSON DEFAULT '{}',
  score DECIMAL(6,2),
  total INT,
  correct INT DEFAULT 0,
  incorrect INT DEFAULT 0,
  time_taken INT,
  status ENUM('in_progress', 'completed') DEFAULT 'in_progress',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES ai_quizzes(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_quiz (user_id, quiz_id)
) ENGINE=InnoDB;

-- ─── AI Usage Tracking ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action ENUM('flashcard_gen', 'quiz_gen', 'summarize', 'process_material') NOT NULL,
  material_id INT,
  tokens_used INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_date (user_id, created_at)
) ENGINE=InnoDB;

-- ─── Seed default subscription plans ─────────────────────────────────────────
INSERT IGNORE INTO subscription_plans
  (name, slug, billing, price, discounted_price, features, ai_credits_per_month)
VALUES
  ('Super Monthly',   'super-monthly',   'monthly',   199, 149,
   '["50 AI Flashcard Decks/month","50 AI Quizzes/month","PDF & YouTube Upload","All Premium Tests","Priority Support"]', 50),
  ('Super Quarterly', 'super-quarterly', 'quarterly', 499, 399,
   '["150 AI Flashcard Decks","150 AI Quizzes","PDF, DOCX & YouTube","All Premium Tests","Priority Support","Save 33%"]', 150),
  ('Super Yearly',    'super-yearly',    'yearly',    1499, 1199,
   '["Unlimited AI Flashcards","Unlimited AI Quizzes","All Source Types","All Premium Tests","Priority Support","Save 50%","Study Analytics"]', 999);
