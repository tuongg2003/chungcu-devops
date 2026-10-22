INSERT INTO apartments (code, block, floor, area_m2, status) VALUES
 ('A-0101','A',1,55.5,'occupied'),('A-0102','A',1,62.0,'occupied'),('A-0201','A',2,55.5,'rented'),
 ('A-0202','A',2,62.0,'vacant'),('A-0301','A',3,75.0,'occupied'),('A-0302','A',3,75.0,'occupied'),
 ('B-0101','B',1,48.0,'occupied'),('B-0102','B',1,48.0,'vacant'),('B-0201','B',2,80.5,'occupied'),
 ('B-0301','B',3,80.5,'rented'),('B-0401','B',4,95.0,'occupied'),('B-0501','B',5,110.0,'occupied');

INSERT INTO residents (full_name, phone, email, apartment_id, is_owner) VALUES
 ('Nguyễn Văn An','0901000001','an@example.com',1,true),
 ('Trần Thị Bình','0901000002','binh@example.com',2,true),
 ('Lê Hoàng Cường','0901000003','cuong@example.com',3,false),
 ('Phạm Thu Dung','0901000004','dung@example.com',5,true),
 ('Hoàng Minh Đức','0901000005','duc@example.com',6,true),
 ('Vũ Thị Hà','0901000006','ha@example.com',7,true),
 ('Đặng Quốc Huy','0901000007','huy@example.com',9,true),
 ('Bùi Lan Khanh','0901000008','khanh@example.com',10,false),
 ('Ngô Thanh Lâm','0901000009','lam@example.com',11,true),
 ('Đỗ Mai Phương','0901000010','phuong@example.com',12,true);

INSERT INTO fees (apartment_id, period, description, amount, due_date, status) VALUES
 (1,'2026-09','Phí quản lý',550000,'2026-09-30','paid'),
 (2,'2026-09','Phí quản lý',620000,'2026-09-30','paid'),
 (5,'2026-09','Phí quản lý',750000,'2026-09-30','unpaid'),
 (1,'2026-10','Phí quản lý + gửi xe',850000,'2026-10-31','unpaid'),
 (2,'2026-10','Phí quản lý + gửi xe',920000,'2026-10-31','unpaid'),
 (9,'2026-10','Phí quản lý',805000,'2026-10-31','paid'),
 (11,'2026-10','Phí quản lý + nước',1250000,'2026-10-31','unpaid');

INSERT INTO notices (title, content) VALUES
 ('Bảo trì thang máy tòa A','Thang máy tòa A bảo trì từ 08:00 đến 11:00 ngày 25/10.'),
 ('Lịch phun khử trùng','Ban quản lý sẽ phun khử trùng khu vực hành lang vào Chủ nhật tuần này.'),
 ('Nhắc nộp phí tháng 10','Cư dân vui lòng hoàn tất nộp phí dịch vụ trước ngày 31/10.');

INSERT INTO complaints (apartment_id, title, content, status) VALUES
 (1,'Ồn ào ban đêm','Căn hộ tầng trên gây tiếng ồn sau 23h.','processing'),
 (5,'Rò rỉ nước hành lang','Có nước rỉ ở trần hành lang tầng 3.','new'),
 (9,'Đèn hành lang hỏng','Bóng đèn tầng 2 tòa B không sáng.','resolved');
