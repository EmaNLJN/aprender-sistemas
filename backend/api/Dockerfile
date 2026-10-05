
FROM composer:2.10@sha256:af98f42dfff7c68ba8d53c2164fd9fde1087b7d449514baa38c418b1f6bc4bac AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN --mount=type=cache,target=/tmp/cache composer install --no-dev --no-interaction --no-progress --prefer-dist --no-scripts --no-autoloader
COPY . .
RUN composer dump-autoload --no-dev --classmap-authoritative --no-interaction \
    && rm -rf tests phpunit.xml phpstan.neon Dockerfile docker

FROM composer:2.10@sha256:af98f42dfff7c68ba8d53c2164fd9fde1087b7d449514baa38c418b1f6bc4bac AS dev-vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN --mount=type=cache,target=/tmp/cache composer install --no-interaction --no-progress --prefer-dist --no-scripts --no-autoloader
COPY . .
RUN composer dump-autoload --optimize --no-interaction

# The first three instructions mirror the root Dockerfile so BuildKit reuses its npm ci layer;
# keep them in sync.
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS curriculum
WORKDIR /app
COPY --from=repo package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY --from=repo content content
COPY --from=repo tools/content tools/content
COPY --from=repo frontend/src/shared/config frontend/src/shared/config
ARG CONTENT_SOURCE_COMMIT=""
RUN node tools/content/build-curriculum.ts

# apk packages are not version-pinned: Alpine removes old ones; the image digest pins PHP and Alpine.
FROM php:8.5-fpm-alpine@sha256:fa01fb1645cd0fc566a5f146b099adace33b906571f972f71f2182a7c12d1cd7 AS base
RUN apk add --no-cache fcgi \
    && docker-php-ext-install pdo_mysql \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY docker/fpm-pool.conf /usr/local/etc/php-fpm.d/zz-taller.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-taller.ini
COPY --chmod=0755 docker/migrate.sh /usr/local/bin/migrate-and-import
WORKDIR /var/www/html

FROM base AS runtime
COPY --from=vendor /app /var/www/html
COPY --from=curriculum /app/build/curriculum.json /app/build/curriculum.meta.json resources/content/
# /var/www/html is www-data 1777 in the base image: PHP could rename public/ or vendor/.
RUN chown root:root /var/www/html && chmod 755 /var/www/html \
    && chown -R www-data:www-data storage bootstrap/cache
USER www-data

FROM base AS dev
COPY --from=dev-vendor /app /var/www/html
COPY --from=curriculum /app/build/curriculum.json /app/build/curriculum.meta.json resources/content/
# Without a .env, phpdotenv warns and Pest records it on every run. Empty: Compose provides the environment.
RUN touch .env
