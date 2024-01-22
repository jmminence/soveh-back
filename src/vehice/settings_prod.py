"""
Django settings for vehice project.

Generated by 'django-admin startproject' using Django 1.11.6.

For more information on this file, see
https://docs.djangoproject.com/en/1.11/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.11/ref/settings/
"""

import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.11/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "hx6zbkv$$72fhqt^$n8=j_#wocxb@qo30q^qhd$1zx)9=4(hf7"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

SITE_URL = "http://vehice.ddns.net"

ALLOWED_HOSTS = ["*"]

LANG_FILE = os.path.join(BASE_DIR, "vehice", "lang.json")

# Application definition

INSTALLED_APPS = [
    "jet",
    "django.contrib.admin",
    "django.contrib.admindocs",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_js_reverse",
    "django_extensions",
    #'debug_toolbar',
    "accounts",
    "workflows",
    "backend",
    "app",
    "avatar",
    "lab",
    "report",
]

MIDDLEWARE = [
    #'debug_toolbar.middleware.DebugToolbarMiddleware',
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "app.middleware.LanguageMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "vehice.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            "templates",
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# WSGI_APPLICATION = 'vehice.wsgi.application'

# Database
# https://docs.djangoproject.com/en/1.11/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "mysql.connector.django",
        "NAME": "vehice",
        "USER": "vehice",
        "PASSWORD": "WxvQL8CLJ3a2Z5NdBmuW",
        "HOST": "localhost",
        "PORT": "3306",
    },
    "dsstore": {
        "ENGINE": "sql_server.pyodbc",  # Requires unixODBC to be installed in unix systems
        "NAME": "DSStoreData",
        "USER": "josemonagas",
        "PASSWORD": "Vehice1354.,",
        "HOST": "vehice.net",
        "PORT": "",
        "OPTIONS": {
            "driver": "ODBC Driver 17 for SQL Server",  # ("ODBC Driver 13 for SQL Server", "SQL Server Native Client 11.0", "FreeTDS")
        },
    },
}

# Password validation
# https://docs.djangoproject.com/en/1.11/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
# https://docs.djangoproject.com/en/1.11/topics/i18n/

LANGUAGE_CODE = "es-CL"

TIME_ZONE = "America/Santiago"

USE_I18N = True

USE_L10N = True

USE_TZ = False

TZ_INFO = False

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.11/howto/static-files/

STATIC_ROOT = os.path.join(BASE_DIR, "public", "static")

STATIC_URL = "/static/"

STATICFILES_DIRS = (os.path.join(BASE_DIR, "static"),)

MEDIA_ROOT = os.path.join(BASE_DIR, "public", "media")

MEDIA_URL = "/media/"

INTERNAL_IPS = "127.0.0.1"

JET_SIDE_MENU_COMPACT = True

JET_SIDE_MENU_ITEMS = [
    {
        "label": ("General"),
        "items": [
            {"name": "auth.user"},
            {"name": "backend.customer"},
            {"name": "backend.exam"},
            {"name": "backend.fixative"},
            {"name": "backend.organ"},
            {"name": "backend.pathology"},
            {"name": "backend.diagnostic"},
            {"name": "backend.organlocation"},
            {"name": "backend.emailtemplate"},
            {"name": "backend.research"},
        ],
    },
]

import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn="https://535cc88a16c3492294d69e5ac3eec858@o48267.ingest.sentry.io/1472410",
    integrations=[DjangoIntegration()],
    send_default_pii=True,
)

DATA_UPLOAD_MAX_MEMORY_SIZE = None
DATA_UPLOAD_MAX_NUMBER_FIELDS = None
FILE_UPLOAD_MAX_MEMORY_SIZE = 15000000
FILE_UPLOAD_PERMISSIONS = 0o644

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_USE_TLS = True
EMAIL_PORT = 587
EMAIL_HOST_USER = "recepcion@vehice.com"
EMAIL_HOST_PASSWORD = "RecVeh159"
EMAIL_HOST_USER2 = "derivacion@vehice.com"
EMAIL_HOST_PASSWORD2 = "DerVeh159"
