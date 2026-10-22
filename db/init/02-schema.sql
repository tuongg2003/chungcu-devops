CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE apartments (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  block VARCHAR(10),
  floor INT,
  area_m2 NUMERIC(6,2),
  status VARCHAR(20) NOT NULL DEFAULT 'vacant' CHECK (status IN ('occupied','vacant','rented'))
);

CREATE TABLE residents (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  apartment_id INT REFERENCES apartments(id) ON DELETE SET NULL,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fees (
  id SERIAL PRIMARY KEY,
  apartment_id INT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL,
  description VARCHAR(200),
  amount NUMERIC(12,0) NOT NULL CHECK (amount >= 0),
  due_date DATE,
  status VARCHAR(10) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE complaints (
  id SERIAL PRIMARY KEY,
  apartment_id INT REFERENCES apartments(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  status VARCHAR(15) NOT NULL DEFAULT 'new' CHECK (status IN ('new','processing','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_residents_apartment ON residents(apartment_id);
CREATE INDEX idx_fees_apartment_status ON fees(apartment_id, status);
