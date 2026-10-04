# Imagen de la API Laravel (ADR 0004). compose.yaml usa `runtime` para php y migrate, y `dev`
# para las pruebas. Composer sólo existe en las etapas de construcción.

# Dependencias de producción. --no-scripts y --no-autoloader esperan al código: el autoload
# optimizado y package:discover necesitan la aplicación completa.
FROM composer:2.10@sha256:af98f42dfff7c68ba8d53c2164fd9fde1087b7d449514baa38c418b1f6bc4bac AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --no-scripts --no-autoloader
COPY . .
RUN composer dump-autoload --no-dev --classmap-authoritative --no-interaction

# Lo mismo con las dependencias de desarrollo (Pest), para la etapa dev.
FROM composer:2.10@sha256:af98f42dfff7c68ba8d53c2164fd9fde1087b7d449514baa38c418b1f6bc4bac AS dev-vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-progress --prefer-dist --no-scripts --no-autoloader
COPY . .
RUN composer dump-autoload --optimize --no-interaction

# PHP-FPM con pdo_mysql y php.ini de producción. fcgi trae cgi-fcgi para el healthcheck de
# compose.yaml. docker-php-ext-install instala y borra solo las herramientas de compilación.
FROM php:8.5-fpm-alpine@sha256:fa01fb1645cd0fc566a5f146b099adace33b906571f972f71f2182a7c12d1cd7 AS base
RUN apk add --no-cache fcgi \
    && docker-php-ext-install pdo_mysql \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY docker/fpm-pool.conf /usr/local/etc/php-fpm.d/zz-taller.conf
WORKDIR /var/www/html

# Producción: el código es de root y PHP sólo lo lee. storage/ y bootstrap/cache/ son de
# www-data por si la imagen corre sin read_only; en compose.yaml el disco es de sólo lectura y
# las vistas compiladas van a un tmpfs.
FROM base AS runtime
COPY --from=vendor /app /var/www/html
RUN chown -R www-data:www-data storage bootstrap/cache
USER www-data

# Pruebas: corre como root en un contenedor descartable, porque Pest y PHPUnit escriben
# cachés dentro del proyecto.
FROM base AS dev
COPY --from=dev-vendor /app /var/www/html
