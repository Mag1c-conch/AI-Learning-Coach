#!/usr/bin/env python3
"""
Test script to verify Flasgger integration
Run this after starting the Flask app
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5001"
SWAGGER_URL = f"{BASE_URL}/apidocs"
APISPEC_URL = f"{BASE_URL}/apispec_1.json"

def test_swagger_ui():
    """Test if Swagger UI is accessible"""
    print("🧪 Testing Swagger UI...")
    try:
        response = requests.get(SWAGGER_URL, timeout=5)
        if response.status_code == 200:
            print(f"✅ Swagger UI is accessible at {SWAGGER_URL}")
            return True
        else:
            print(f"❌ Failed to access Swagger UI: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error accessing Swagger UI: {e}")
        return False

def test_apispec():
    """Test if OpenAPI spec is accessible"""
    print("\n🧪 Testing OpenAPI Specification...")
    try:
        response = requests.get(APISPEC_URL, timeout=5)
        if response.status_code == 200:
            spec = response.json()
            print(f"✅ OpenAPI spec is accessible")

            # Print basic info
            info = spec.get("info", {})
            print(f"   Title: {info.get('title', 'N/A')}")
            print(f"   Version: {info.get('version', 'N/A')}")
            print(f"   Description: {info.get('description', 'N/A')[:60]}...")

            # Count paths
            paths = spec.get("paths", {})
            print(f"   Total API Endpoints: {len(paths)}")

            # Print tags
            tags = spec.get("tags", [])
            print(f"\n📋 API Tags ({len(tags)}):")
            for tag in tags:
                name = tag.get("name", "Unknown")
                desc = tag.get("description", "")
                print(f"   - {name}")

            return True
        else:
            print(f"❌ Failed to get OpenAPI spec: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error fetching OpenAPI spec: {e}")
        return False

def test_api_endpoints():
    """Test a few basic API endpoints"""
    print("\n🧪 Testing API Endpoints...")

    endpoints = [
        ("GET", "/auth/me", "Authentication Check"),
        ("GET", "/courses", "List Courses"),
        ("GET", "/assignments", "List Assignments"),
    ]

    for method, path, description in endpoints:
        try:
            url = f"{BASE_URL}{path}"
            response = requests.request(method, url, timeout=5)
            status = "✅" if response.status_code < 500 else "❌"
            print(f"   {status} {method} {path} - {response.status_code} ({description})")
        except Exception as e:
            print(f"   ❌ {method} {path} - Error: {str(e)[:50]}")

def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 AI Learning Coach - API Documentation Test")
    print("=" * 60)

    print(f"\nTesting against: {BASE_URL}")

    results = []
    results.append(test_swagger_ui())
    results.append(test_apispec())
    test_api_endpoints()

    print("\n" + "=" * 60)
    if all(results):
        print("✅ All tests passed! Flasgger is working correctly.")
        print(f"\n📖 Access API documentation at: {SWAGGER_URL}")
        return 0
    else:
        print("❌ Some tests failed. Please check the server is running.")
        print(f"   Start the server with: python wsgi.py")
        return 1

if __name__ == "__main__":
    sys.exit(main())
