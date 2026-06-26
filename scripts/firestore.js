// scripts/firestore.js
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Configurando Firestore...');

// 1. Verificar firestore.rules
if (!fs.existsSync('firestore.rules')) {
  const rules = ules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /licencias/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
};
  fs.writeFileSync('firestore.rules', rules);
  console.log('firestore.rules creado');
}

// 2. Desplegar
console.log('Desplegando reglas...');
try {
  execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
  console.log('Reglas desplegadas!');
} catch (e) {
  console.log('Error:', e.message);
}
