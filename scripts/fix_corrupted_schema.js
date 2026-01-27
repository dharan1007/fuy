
const fs = require('fs');
const path = 'c:/Users/dhara/fuy/prisma/schema.prisma';

try {
    let content = fs.readFileSync(path, 'utf8');

    // The corrupted part starts after VerificationCode and ends before ProductWishlist
    const startMarker = 'model VerificationCode {';
    const endMarker = 'model ProductWishlist {';

    const startIndex = content.lastIndexOf(startMarker);
    const endIndex = content.lastIndexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
        // Find the specific corrupted block (it's between the closing brace of VerificationCode and start of ProductWishlist)
        // We can just reconstruct the end of the file from VerificationCode onwards

        // Find the closing brace of VerificationCode
        const verificationParams = content.substring(startIndex).indexOf('}');
        const verificationEnd = startIndex + verificationParams + 1;

        // Construct clean ending
        const cleanPrivacyAllowlist = `

model PrivacyAllowlist {
  id        String   @id @default(cuid())
  ownerId   String
  viewerId  String
  feature   String // POSTS | CARD | STALK_ME
  createdAt DateTime @default(now())

  owner  User @relation("PrivacyOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  viewer User @relation("PrivacyViewer", fields: [viewerId], references: [id], onDelete: Cascade)

  @@unique([ownerId, viewerId, feature])
  @@index([ownerId])
  @@index([viewerId])
}

`;

        // Check if we found the corrupted part (wide chars usually imply significant length or pattern)
        // We will just replace everything between verificationEnd and endIndex with the clean model

        const pre = content.substring(0, verificationEnd);
        const post = content.substring(endIndex); // starts with model ProductWishlist

        const newContent = pre + cleanPrivacyAllowlist + post;

        fs.writeFileSync(path, newContent);
        console.log('Schema repaired successfully.');
    } else {
        console.log('Could not locate models.');
    }
} catch (e) {
    console.error('Error:', e);
}
