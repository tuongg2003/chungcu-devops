// Khai bao cac "thuc the" quan ly. Moi thuc the sinh ra bo CRUD tuong ung.
// Ten bang / cot chi lay tu file nay (whitelist) nen khong the bi SQL injection qua ten cot.
module.exports = {
  apartments: {
    title: 'Căn hộ', table: 'apartments', search: 'code',
    fields: [
      { name: 'code', label: 'Mã căn hộ', type: 'text', required: true },
      { name: 'block', label: 'Tòa', type: 'text' },
      { name: 'floor', label: 'Tầng', type: 'number' },
      { name: 'area_m2', label: 'Diện tích (m²)', type: 'number' },
      { name: 'status', label: 'Trạng thái', type: 'select', required: true, options: ['occupied', 'vacant', 'rented'] },
    ],
  },
  residents: {
    title: 'Cư dân', table: 'residents', search: 'full_name',
    fields: [
      { name: 'full_name', label: 'Họ tên', type: 'text', required: true },
      { name: 'phone', label: 'Điện thoại', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'apartment_id', label: 'Căn hộ', type: 'ref', ref: { table: 'apartments', label: 'code' } },
      { name: 'is_owner', label: 'Chủ hộ', type: 'bool', required: true },
    ],
  },
  fees: {
    title: 'Phí dịch vụ', table: 'fees', search: 'period',
    fields: [
      { name: 'apartment_id', label: 'Căn hộ', type: 'ref', required: true, ref: { table: 'apartments', label: 'code' } },
      { name: 'period', label: 'Kỳ (YYYY-MM)', type: 'text', required: true },
      { name: 'description', label: 'Nội dung', type: 'text' },
      { name: 'amount', label: 'Số tiền (VNĐ)', type: 'number', required: true },
      { name: 'due_date', label: 'Hạn nộp', type: 'date' },
      { name: 'status', label: 'Trạng thái', type: 'select', required: true, options: ['unpaid', 'paid'] },
    ],
    actions: [{ name: 'pay', label: 'Đã thu', field: 'status', value: 'paid', showWhen: { status: 'unpaid' } }],
  },
  notices: {
    title: 'Thông báo', table: 'notices', search: 'title',
    fields: [
      { name: 'title', label: 'Tiêu đề', type: 'text', required: true },
      { name: 'content', label: 'Nội dung', type: 'textarea', required: true },
    ],
  },
  complaints: {
    title: 'Khiếu nại', table: 'complaints', search: 'title',
    fields: [
      { name: 'apartment_id', label: 'Căn hộ', type: 'ref', ref: { table: 'apartments', label: 'code' } },
      { name: 'title', label: 'Tiêu đề', type: 'text', required: true },
      { name: 'content', label: 'Nội dung', type: 'textarea' },
      { name: 'status', label: 'Trạng thái', type: 'select', required: true, options: ['new', 'processing', 'resolved'] },
    ],
    actions: [{ name: 'resolve', label: 'Đã xử lý', field: 'status', value: 'resolved', showWhen: { status: ['new', 'processing'] } }],
  },
};
