/* ═══════════════════════════════════════════════════════════════
   CLOUDINARY UPLOAD MODULE
   Заменяет Firebase Storage (uploadBytes + getDownloadURL).
   Использование:
     import { uploadToCloudinary } from './cloudinary-upload.js';
     const url = await uploadToCloudinary(file, 'avatars');
   Возвращает прямую ссылку (URL) на файл — её можно класть
   в Firestore точно так же, как раньше клали ссылку из Storage.
═══════════════════════════════════════════════════════════════ */

const CLOUD_NAME = 'dlvorvsqx';
const UPLOAD_PRESET = 'TutorApp';

/**
 * Загружает файл на Cloudinary и возвращает прямую ссылку на него.
 * @param {File} file - файл из <input type="file">
 * @param {string} folder - подпапка внутри Cloudinary (например 'avatars', 'banners', 'post_images', 'chat_files')
 * @returns {Promise<string>} url - постоянная ссылка на загруженный файл
 */
export async function uploadToCloudinary(file, folder = 'uploads') {
    if (!file) throw new Error('Файл не передан');

    // Определяем тип ресурса для Cloudinary
    let resourceType = 'raw'; // документы, аудио и прочее
    if (file.type.startsWith('image/')) resourceType = 'image';
    if (file.type.startsWith('video/')) resourceType = 'video';

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('Cloudinary upload error:', errText);
        throw new Error('Не удалось загрузить файл на Cloudinary');
    }

    const data = await response.json();
    return data.secure_url; // постоянная https-ссылка на файл
}