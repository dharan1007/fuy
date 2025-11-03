# 🚀 How to Run FUY Mobile App

## ⚡ Quick Start (Windows)

### Option 1: Using Batch File (Easiest)
1. Double-click `RUN_APP.bat` in the mobile folder
2. Wait for the dev server to start (2-3 minutes first time)
3. Scan the QR code with Expo Go app or press `a` for Android

### Option 2: Manual Command Line
```bash
cd c:\Users\dhara\fuy\mobile
npm start
```

When prompted about port 8081, press `y` or just let it use the suggested port.

---

## 📱 Running the App

After `npm start`, you'll see:
```
Tunnel ready. Using tunnel at:
...
```

Then choose how to run:

### On Android Emulator
- Press `a` in the terminal

### On iOS Simulator (Mac only)
- Press `i` in the terminal

### On Web Browser
- Press `w` in the terminal

### On Your Phone
1. Download **Expo Go** app
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/us/app/expo-go/id1618157881)
2. Scan the QR code shown in terminal with Expo Go

---

## 🔐 Login Credentials

After the app loads:
```
Email: demo@example.com
Password: password
```

---

## 🐛 Troubleshooting

### "Port 8081 is already in use"
**Solution 1**: Use suggested port
- When prompted, press `y` to use port 8082 instead

**Solution 2**: Kill the process manually (Windows)
```bash
# Find process using port 8081
netstat -aon | find "8081"

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Then run again
npm start
```

### "Unable to resolve asset icon.png"
This is just a warning - the app will still run. Icons are optional.

### "Bundling failed" or other errors
Try these in order:
```bash
# Clear cache and reinstall
rm -r node_modules package-lock.json
npm install

# Start with fresh cache
npm start -- --clear
```

### App won't connect to backend
1. Check that backend is running (should be on `http://localhost:3000`)
2. Verify `.env` file has correct URL:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```
3. If backend is on different URL, edit `.env` and restart

### "Module not found" errors
```bash
# Reinstall everything
npm install
npm start -- --clear
```

---

## 🎯 What You Should See

1. **Splash Screen** - App is loading
2. **Login Screen** - Email and password fields
3. **Dashboard** - After login with community feed

---

## 💡 Keyboard Shortcuts (while app is running)

| Key | Action |
|-----|--------|
| `r` | Reload app |
| `c` | Clear cache |
| `j` | Toggle developer menu |
| `shift+m` | Show dev menu |
| `q` | Quit Expo |

---

## 📚 Backend Setup

Make sure your web backend is running:
```bash
cd ..  # Go to web directory
npm run dev
```

The backend should be accessible at `http://localhost:3000`

---

## ✅ First Test Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created
- [ ] Backend running (`npm run dev` in web folder)
- [ ] Mobile dev server started (`npm start`)
- [ ] App loaded in emulator/device
- [ ] Able to login with demo@example.com
- [ ] Dashboard visible with posts

---

## 🔄 Development Workflow

1. **Make code changes** in `src/` folder
2. **Save the file** - changes auto-reload
3. **Check the app** for your changes
4. **Press `r`** to full reload if needed

---

## 📦 Project Structure

```
mobile/
├── src/
│   ├── screens/       ← Mobile screens
│   ├── components/    ← Reusable UI
│   ├── services/      ← API calls
│   ├── navigation/    ← App routing
│   ├── store/         ← State management
│   ├── types/         ← TypeScript types
│   ├── constants/     ← Config & colors
│   └── App.tsx        ← Main entry
├── .env               ← Environment variables
├── app.json           ← Expo config
├── package.json       ← Dependencies
└── RUN_APP.bat        ← Quick start (Windows)
```

---

## 🚀 Next Steps After Getting App Running

1. Explore the Dashboard screen
2. Read `IMPLEMENTATION_GUIDE.md` to add new screens
3. Create your own screen (use Dashboard as template)
4. Test API integration
5. Add more features!

---

## 📞 Need Help?

Check these files in order:
1. This file (HOW_TO_RUN.md)
2. `START_HERE.md`
3. `SETUP_COMPLETE.md`
4. `README.md`
5. `IMPLEMENTATION_GUIDE.md`

---

## ⚠️ Important Notes

- **First run takes 3-5 minutes** - be patient!
- **Bundle size**: App will be ~50MB installed
- **Network**: Make sure your phone/emulator has internet
- **Backend**: Required for login and features
- **Hot reload**: Most changes reload automatically

---

**Happy coding! 🎉**

If you get stuck, check the error message carefully - they usually tell you exactly what's wrong!
