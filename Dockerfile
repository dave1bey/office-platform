FROM node:20-alpine
WORKDIR /app

# Copy server, dependencies and pre-built frontend distribution
COPY backend ./backend
COPY frontend ./frontend
COPY sample_action_plan.xlsx ./sample_action_plan.xlsx
COPY sample_action_plan.csv ./sample_action_plan.csv
COPY package.json ./package.json

ENV PORT=8090
ENV NODE_ENV=production

EXPOSE 8090
CMD ["node", "backend/server.cjs"]
