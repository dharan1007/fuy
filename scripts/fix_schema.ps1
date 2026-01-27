
$path = "c:\Users\dhara\fuy\prisma\schema.prisma"
$content = Get-Content -Path $path -Raw
# Replace strict match of the line we saw in view_file
$content = $content.Replace("uniqueCode      String   @unique", "uniqueCode      String   @unique @default(cuid())")
Set-Content -Path $path -Value $content
