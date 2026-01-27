
$path = "c:\Users\dhara\fuy\prisma\schema.prisma"
$content = Get-Content -Path $path -Raw

# 1. Add uniqueCode to Product
$content = $content.Replace("category        String? // CLOTHING, ELECTRONICS, ACCESSORIES, etc.", "category        String? // CLOTHING, ELECTRONICS, ACCESSORIES, etc.`r`n  uniqueCode      String   @unique")

# 2. Add taggedPosts to Product
$content = $content.Replace("views        ProductView[]", "views        ProductView[]`r`n  taggedPosts  Post[]            @relation(`"PostTaggedProduct`")")

# 3. Add taggedProductId to Post
$content = $content.Replace("viewCount   Int @default(0)", "viewCount   Int @default(0)`r`n`r`n  taggedProductId String?`r`n  taggedProduct   Product? @relation(`"PostTaggedProduct`", fields: [taggedProductId], references: [id], onDelete: SetNull)")

Set-Content -Path $path -Value $content
