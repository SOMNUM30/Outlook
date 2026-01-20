#!/usr/bin/env python3
"""
Backend API Testing for Outlook AI Classifier
Tests all API endpoints with proper authentication handling
"""

import requests
import sys
import json
from datetime import datetime

class OutlookClassifierAPITester:
    def __init__(self, base_url="https://folder-automation-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, status_code=None, error=None, expected_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - Status: {status_code}")
        else:
            print(f"❌ {name} - Expected {expected_status}, got {status_code}")
            if error:
                print(f"   Error: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "status_code": status_code,
            "error": error,
            "expected_status": expected_status
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
        
        # Add token if available
        if self.token and 'Authorization' not in default_headers:
            default_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, params=params, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, params=params, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, params=params, timeout=10)

            success = response.status_code == expected_status
            self.log_test(name, success, response.status_code, None, expected_status)
            
            return success, response.json() if success and response.content else {}

        except requests.exceptions.Timeout:
            self.log_test(name, False, None, "Request timeout", expected_status)
            return False, {}
        except requests.exceptions.ConnectionError:
            self.log_test(name, False, None, "Connection error", expected_status)
            return False, {}
        except Exception as e:
            self.log_test(name, False, None, str(e), expected_status)
            return False, {}

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n🔍 Testing Basic Endpoints...")
        
        # Test root API endpoint
        self.run_test(
            "API Root",
            "GET",
            "api/",
            200
        )
        
        # Test health endpoint
        self.run_test(
            "Health Check",
            "GET", 
            "api/health",
            200
        )

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication Endpoints...")
        
        # Test login endpoint (should return error about missing MS_CLIENT_ID)
        success, response = self.run_test(
            "Auth Login (No MS_CLIENT_ID)",
            "GET",
            "api/auth/login",
            500  # Expected to fail due to missing MS_CLIENT_ID
        )
        
        # Test protected endpoints without token (should return 401)
        self.run_test(
            "Get User Info (No Token)",
            "GET",
            "api/auth/me",
            422  # FastAPI validation error for missing token parameter
        )

    def test_protected_endpoints_without_auth(self):
        """Test protected endpoints without authentication"""
        print("\n🔍 Testing Protected Endpoints (No Auth)...")
        
        # Test rules endpoint without token
        self.run_test(
            "Get Rules (No Token)",
            "GET",
            "api/rules/",
            422  # FastAPI validation error for missing token parameter
        )
        
        # Test classification stats without token
        self.run_test(
            "Get Classification Stats (No Token)",
            "GET",
            "api/classify/stats",
            422  # FastAPI validation error for missing token parameter
        )
        
        # Test mail folders without token
        self.run_test(
            "Get Mail Folders (No Token)",
            "GET",
            "api/mail/folders",
            422  # FastAPI validation error for missing token parameter
        )

    def test_invalid_token_endpoints(self):
        """Test endpoints with invalid token"""
        print("\n🔍 Testing Endpoints with Invalid Token...")
        
        # Test with invalid token
        invalid_token = "invalid_token_123"
        
        self.run_test(
            "Get Rules (Invalid Token)",
            "GET",
            "api/rules/",
            401,  # Should return 401 for invalid token
            params={"token": invalid_token}
        )
        
        self.run_test(
            "Get Classification Stats (Invalid Token)",
            "GET",
            "api/classify/stats",
            401,  # Should return 401 for invalid token
            params={"token": invalid_token}
        )

    def test_cors_headers(self):
        """Test CORS configuration"""
        print("\n🔍 Testing CORS Headers...")
        
        try:
            response = requests.options(f"{self.base_url}/api/", timeout=10)
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            if cors_headers['Access-Control-Allow-Origin']:
                self.log_test("CORS Headers Present", True, response.status_code)
                print(f"   CORS Origin: {cors_headers['Access-Control-Allow-Origin']}")
            else:
                self.log_test("CORS Headers Present", False, response.status_code, "No CORS headers found")
                
        except Exception as e:
            self.log_test("CORS Headers Test", False, None, str(e))

    def generate_report(self):
        """Generate test report"""
        print(f"\n📊 Test Results Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Detailed results
        print(f"\n📋 Detailed Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if not result["success"] and result["error"]:
                print(f"   Error: {result['error']}")

def main():
    """Main test execution"""
    print("🚀 Starting Outlook AI Classifier Backend Tests")
    print("=" * 60)
    
    tester = OutlookClassifierAPITester()
    
    # Run all test suites
    tester.test_basic_endpoints()
    tester.test_auth_endpoints()
    tester.test_protected_endpoints_without_auth()
    tester.test_invalid_token_endpoints()
    tester.test_cors_headers()
    
    # Generate final report
    tester.generate_report()
    
    # Return appropriate exit code
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())