# Stage 1: Build
FROM node:22-slim AS builder
WORKDIR /app

# heap 3GB — พอดีกับ RAM 3.8GB ของ VPS (ตั้งสูงกว่า RAM จะโดน OOM killer ก่อน GC)
ENV NODE_OPTIONS=--max-old-space-size=3072

# npm install (ไม่ใช่ npm ci) — starter-kit ไม่ commit package-lock.json (gitignore)
# ดึง sd-render ตาม ^range จาก registry → ต้องมั่นใจว่า lib version ที่ fix แล้วถูก publish
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve ด้วย nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
