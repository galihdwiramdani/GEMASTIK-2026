# Menggunakan image Node.js yang ringan
FROM node:18-alpine

# Menentukan direktori kerja di dalam kontainer
WORKDIR /app

# Menyalin fail dependensi terlebih dahulu (untuk efisiensi cache Docker)
COPY package.json package-lock.json* ./

# Menginstal semua dependensi
RUN npm install

# Menyalin seluruh kode proyek ke dalam kontainer
COPY . .

# Menghasilkan klien Prisma (Wajib sebelum build Next.js)
RUN npx prisma generate

# Melakukan proses Build (Mengubah TypeScript/React menjadi HTML/JS statis produksi)
RUN npm run build

# Membuka port 3000
EXPOSE 3000

# Perintah bawaan (bisa ditimpa oleh docker-compose)
CMD ["npm", "run", "start"]