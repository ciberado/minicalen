export function generateSymbol(label: string): string {
  const uppercaseLetters = label.match(/[A-Z]/g);

  if (uppercaseLetters && uppercaseLetters.length > 0) {
    return uppercaseLetters.slice(0, 2).join('');
  }

  return label.charAt(0).toUpperCase();
}
