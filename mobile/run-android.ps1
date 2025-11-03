# Run Android build with JDK 17 configuration
# This script ensures the correct JDK is used for Android Gradle Plugin 8.1.1

# Force JDK 17
$env:JAVA_HOME = "C:\Users\dhara\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.17.10-hotspot"

# Remove JDK 21 from PATH if present
$env:PATH = $env:PATH -replace "C:\\Program Files\\Eclipse Adoptium\\jdk-21\.0\.5\.11-hotspot\\bin;?", ""

Write-Host "JAVA_HOME set to JDK 17: $env:JAVA_HOME" -ForegroundColor Green
Write-Host "Running: npx expo run:android" -ForegroundColor Cyan

# Run the Expo CLI
npx expo run:android @args
