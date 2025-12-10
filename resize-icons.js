const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function resizeIcons() {
    const inputPath = 'C:\\Users\\dhara\\.gemini\\antigravity\\brain\\57dc4162-c5c5-4999-9be9-5cefe3f47fb9\\uploaded_image_1765339510684.png';
    const mobileAssets = 'c:\\Users\\dhara\\fuy\\mobile\\assets';

    // Create opaque black square background
    const bg = await sharp({
        create: {
            width: 1024,
            height: 1024,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 1 }
        }
    }).png().toBuffer();

    // Resize input to fit 1024x1024 (contain)
    const overlay = await sharp(inputPath)
        .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

    // Composite
    const finalBuffer = await sharp(bg)
        .composite([{ input: overlay }])
        .png()
        .toBuffer();

    // Save to all destinations
    const targets = [
        path.join(mobileAssets, 'icon.png'),
        path.join(mobileAssets, 'adaptive-icon.png'),
        path.join(mobileAssets, 'splash-icon.png'),
        'c:\\Users\\dhara\\fuy\\public\\icon.png',
        'c:\\Users\\dhara\\fuy\\public\\apple-icon.png'
    ];

    for (const target of targets) {
        await sharp(finalBuffer).toFile(target);
        console.log(`Saved ${target}`);
    }
}

resizeIcons().catch(console.error);
