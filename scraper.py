import re
from urllib.parse import urlparse

import requests
from selectolax.lexbor import LexborHTMLParser


PRICE_REGEX = re.compile(r"\d{1,3}(?:[.,]\d{3})+")

STORE_CONFIG = {
    "cellphones": {
        "domains": ["cellphones.com.vn"],
        "price_selectors": [
            ".t-red.t-bold",
            ".block-box-price .special-price",
            ".product__price--show",
            "p.special-price",
            "[class*=price]",
        ],
    },
    "thegioididong": {
        "domains": ["thegioididong.com"],
        "price_selectors": [
            ".box-price-present",
            ".price-one",
            ".price-current",
            ".box-price",
            "[class*=price]",
        ],
    },
    "topzone": {
        "domains": ["topzone.vn", "iphone.topzone.vn"],
        "price_selectors": [
            ".box-price-present",
            ".price-one",
            ".price-current",
            ".box-price",
            "[class*=price]",
        ],
    },
    "hoanghamobile": {
        "domains": ["hoanghamobile.com"],
        "price_selectors": [
            ".product-price",
            ".product-price__current",
            ".detail-price",
            ".price",
            "[class*=price]",
        ],
    },
}


def find_store(url):
    domain = urlparse(url).netloc.lower()
    for store_name, config in STORE_CONFIG.items():
        for item in config["domains"]:
            if item in domain:
                return store_name
    return None


def clean_text(text):
    return " ".join(str(text).split())


def price_to_number(price_text):
    if not price_text:
        return None

    digits = ""
    for char in str(price_text):
        if char.isdigit():
            digits += char

    if digits == "":
        return None

    price = int(digits)
    if price < 1000000:
        return None
    return price


def format_price(price_number):
    if not price_number:
        return ""
    return f"{price_number:,}".replace(",", ".") + "d"


def find_title(parser):
    h1 = parser.css_first("h1")
    if h1:
        return clean_text(h1.text())

    meta_title = parser.css_first("meta[property='og:title']")
    if meta_title:
        return clean_text(meta_title.attributes.get("content", ""))

    title = parser.css_first("title")
    if title:
        return clean_text(title.text())

    return "Khong lay duoc ten san pham"


def find_price_by_selector(parser, selectors):
    for selector in selectors:
        nodes = parser.css(selector)
        for node in nodes:
            text = clean_text(node.text())
            match = PRICE_REGEX.search(text)
            if match:
                price_number = price_to_number(match.group())
                if price_number:
                    return format_price(price_number), price_number
    return "", None


def find_price_by_text(html):
    matches = PRICE_REGEX.findall(html)
    for match in matches:
        price_number = price_to_number(match)
        if price_number:
            return format_price(price_number), price_number

    return "", None


def scrape_product(url, timeout=10, user_agent=None):
    store = find_store(url)
    if store is None:
        return {
            "success": False,
            "url": url,
            "platform": "unsupported",
            "product_name": "",
            "price": "",
            "price_value": None,
            "currency": "VND",
            "availability": "unknown",
            "error": "Website chua duoc ho tro.",
        }

    headers = {
        "User-Agent": user_agent
        or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=timeout)
    except Exception as error:
        return {
            "success": False,
            "url": url,
            "platform": store,
            "product_name": "",
            "price": "",
            "price_value": None,
            "currency": "VND",
            "availability": "unknown",
            "error": "Khong truy cap duoc trang: " + str(error),
        }

    if response.status_code != 200:
        return {
            "success": False,
            "url": url,
            "platform": store,
            "product_name": "",
            "price": "",
            "price_value": None,
            "currency": "VND",
            "availability": "unknown",
            "error": "Trang tra ve loi HTTP " + str(response.status_code),
        }

    parser = LexborHTMLParser(response.text)
    product_name = find_title(parser)
    selectors = STORE_CONFIG[store]["price_selectors"]

    price_text, price_value = find_price_by_selector(parser, selectors)
    if price_value is None:
        price_text, price_value = find_price_by_text(response.text)

    if price_value is None:
        return {
            "success": False,
            "url": url,
            "platform": store,
            "product_name": product_name,
            "price": "",
            "price_value": None,
            "currency": "VND",
            "availability": "unknown",
            "error": "Khong tim thay gia tren trang.",
        }

    return {
        "success": True,
        "url": url,
        "platform": store,
        "product_name": product_name,
        "price": price_text,
        "price_value": price_value,
        "currency": "VND",
        "availability": "unknown",
        "error": None,
    }


def scrape_products(urls, timeout=10, user_agent=None):
    results = []
    for url in urls:
        result = scrape_product(url, timeout, user_agent)
        results.append(result)
    return results
