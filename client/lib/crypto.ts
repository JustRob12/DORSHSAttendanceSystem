import CryptoJS from "crypto-js";

const SECRET = process.env.NEXT_PUBLIC_ENCRYPTION_KEY ?? "DORSHS@SciTrack2026#SecretKey!";

/** Encrypt plain text → AES cipher string (stored in DB) */
export function encryptPassword(plain: string): string {
    return CryptoJS.AES.encrypt(plain, SECRET).toString();
}

/** Decrypt AES cipher string → plain text (for admin display / login compare) */
export function decryptPassword(cipher: string): string {
    try {
        const bytes = CryptoJS.AES.decrypt(cipher, SECRET);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
        return "";
    }
}
