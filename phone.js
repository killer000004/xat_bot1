// Telefon raqamlarni bir xil formatga keltirish (faqat raqamlar, boshida 998 bilan).
// Bu turli yozilish usullarini (+998901234567, 998901234567, 901234567, 0901234567,
// bo'shliq yoki tire bilan yozilgan) bitta formatga tenglashtiradi, shunda website'dan
// kelgan raqam va parent Telegramdan ulashgan kontakt raqami mos tushadi.
function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d]/g, '');

  if (digits.length === 9) {
    // masalan 901234567 -> 998901234567 deb hisoblaymiz (O'zbekiston uchun)
    digits = '998' + digits;
  } else if (digits.length === 10 && digits.startsWith('0')) {
    // 0901234567 -> 901234567 -> 998901234567
    digits = '998' + digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('998')) {
    // allaqachon to'g'ri
  }
  // boshqa davlat kodlari bo'lsa ham, faqat raqamlarni qaytaramiz
  return digits;
}

module.exports = { normalizePhone };
