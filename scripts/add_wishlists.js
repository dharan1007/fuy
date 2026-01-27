
const fs = require('fs');
const path = 'c:/Users/dhara/fuy/prisma/schema.prisma';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Add to Product
    if (!content.includes('wishlists    ProductWishlist[]') && content.includes('model Product {')) {
        // Insert before the closing brace of Product
        // We look for 'model Product {' then the next '}' is NOT necessarily the end, need to count braces?
        // Or just regex replace the known ending fields?
        // We know 'taggedPosts' is there.
        const productRegex = /(taggedPosts\s+Post\[\]\s+@relation\("PostTaggedProduct"\))/;
        if (productRegex.test(content)) {
            content = content.replace(productRegex, '$1\n  wishlists    ProductWishlist[]');
            console.log('Added wishlists to Product.');
        } else {
            console.log('Could not find anchor in Product.');
        }
    }

    // Add to User
    if (!content.includes('wishlists    ProductWishlist[]') && content.includes('model User {')) {
        // Anchor: productViews
        const userRegex = /(productViews\s+ProductView\[\]\s+@relation\("ProductViews"\))/;
        if (userRegex.test(content)) {
            content = content.replace(userRegex, '$1\n  wishlists    ProductWishlist[]');
            console.log('Added wishlists to User.');
        } else {
            console.log('Could not find anchor in User.');
        }
    }

    fs.writeFileSync(path, content);
} catch (e) {
    console.error('Error:', e);
}
