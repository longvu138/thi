export const ROUND_STATUSES = [
 { value: 'DRAFT', label: 'Bản nháp', color: 'default' },
 { value: 'OPEN', label: 'Đang mở', color: 'green' },
 { value: 'CLOSED', label: 'Đã đóng', color: 'default' },
];
export const ROUND_SWITCHES = [
 { key: 'stopAfterPass', label: 'Dừng thi tiếp sau khi đạt' },
 { key: 'showCorrectAnswers', label: 'Hiển thị đáp án đúng sau khi kết thúc lượt' },
 { key: 'shuffleQuestions', label: 'Xáo trộn thứ tự câu hỏi' },
 { key: 'shuffleOptions', label: 'Xáo trộn lựa chọn (với câu cho phép)' },
];
export const ROUND_DEFAULTS = { durationMinutes: 30, maxAttempts: 1, passingPercentage: 70, status: 'DRAFT', stopAfterPass: false, showCorrectAnswers: true, shuffleQuestions: true, shuffleOptions: true, trialStartAt: null, startAt: null, endAt: null };
