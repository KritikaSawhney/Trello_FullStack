-- Trello Clone Database Schema (MySQL)
-- Disable FK checks to allow clean drops
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS checklists;
DROP TABLE IF EXISTS card_members;
DROP TABLE IF EXISTS card_labels;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS lists;
DROP TABLE IF EXISTS labels;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS boards;
SET FOREIGN_KEY_CHECKS = 1;

-- Boards table
CREATE TABLE boards (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  background_color VARCHAR(50) DEFAULT '#0079BF',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Members table (sample users, no auth required)
CREATE TABLE members (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  initials VARCHAR(3) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  avatar_color VARCHAR(50) DEFAULT '#0079BF',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Labels table
CREATE TABLE labels (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  board_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Lists table
CREATE TABLE lists (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  board_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Cards table
CREATE TABLE cards (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  list_id VARCHAR(36) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  due_date DATETIME,
  is_archived TINYINT(1) DEFAULT 0,
  cover_color VARCHAR(50),
  cover_image_url VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
);

-- Card-Label junction table
CREATE TABLE card_labels (
  card_id VARCHAR(36) NOT NULL,
  label_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (card_id, label_id),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

-- Card-Member junction table
CREATE TABLE card_members (
  card_id VARCHAR(36) NOT NULL,
  member_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (card_id, member_id),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Checklists table
CREATE TABLE checklists (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  card_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Checklist',
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Checklist items table
CREATE TABLE checklist_items (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  checklist_id VARCHAR(36) NOT NULL,
  title VARCHAR(500) NOT NULL,
  is_complete TINYINT(1) DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE comments (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  card_id VARCHAR(36) NOT NULL,
  member_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Attachments table
CREATE TABLE attachments (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  card_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_lists_board_id ON lists(board_id);
CREATE INDEX idx_cards_list_id ON cards(list_id);
CREATE INDEX idx_card_labels_card_id ON card_labels(card_id);
CREATE INDEX idx_card_members_card_id ON card_members(card_id);
CREATE INDEX idx_checklists_card_id ON checklists(card_id);
CREATE INDEX idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX idx_comments_card_id ON comments(card_id);
CREATE INDEX idx_labels_board_id ON labels(board_id);
CREATE INDEX idx_attachments_card_id ON attachments(card_id);
CREATE FULLTEXT INDEX idx_cards_title ON cards(title);
