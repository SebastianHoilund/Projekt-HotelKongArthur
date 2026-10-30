FROM nginx:alpine
COPY . /usr/share/nginx/html/
RUN mv /usr/share/nginx/html/nginx.conf /etc/nginx/conf.d/default.conf
HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
