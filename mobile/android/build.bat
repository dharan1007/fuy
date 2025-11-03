@echo off
REM Build script with JDK 17 configuration
set JAVA_HOME=C:\Users\dhara\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.17.10-hotspot
set PATH=C:\Users\dhara\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.17.10-hotspot\bin;C:\Users\dhara\AppData\Local\Android\Sdk\platform-tools;C:\Users\dhara\AppData\Local\Android\Sdk\tools;%PATH:C:\Program Files\Eclipse Adoptium\jdk-21.0.5.11-hotspot\bin;=%

echo JAVA_HOME set to: %JAVA_HOME%
echo Building APK with JDK 17...

./gradlew assembleDebug -x lint -x test --build-cache
pause
