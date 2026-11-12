FROM node:20-alpine
WORKDIR /app

# Copy server and pre-built frontend distribution
COPY backend ./backend
COPY frontend/dist ./frontend/dist
COPY sample_action_plan.xlsx ./sample_action_plan.xlsx
COPY sample_action_plan.csv ./sample_action_plan.csv

ENV PORT=8091
ENV NODE_ENV=production

EXPOSE 8091
CMD ["node", "backend/server.cjs"]

