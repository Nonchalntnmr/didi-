#!/usr/bin/env python3
"""
Bhaiya AI Backend API Testing Suite
Tests all backend endpoints with authentication
"""

import requests
import sys
import json
from datetime import datetime

class BhaiyaAPITester:
    def __init__(self, base_url="https://mentor-live-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = "test_session_1774370472842"  # From auth setup
        self.user_id = "test-user-1774370472841"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add session token for authenticated endpoints
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
                        print(f"   Response: {response_data}")
                except:
                    pass
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response text: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "error": response.text[:200]
                })

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION ENDPOINTS")
        print("="*50)
        
        # Test /auth/me with valid session
        success, user_data = self.run_test("Get Current User", "GET", "auth/me", 200)
        
        # Test logout
        self.run_test("Logout", "POST", "auth/logout", 200)
        
        return success

    def test_chat_endpoints(self):
        """Test chat endpoints"""
        print("\n" + "="*50)
        print("TESTING CHAT ENDPOINTS")
        print("="*50)
        
        # Test chat message
        chat_data = {"message": "Hello Bhaiya, this is a test message"}
        success, response = self.run_test("Send Chat Message", "POST", "chat", 200, chat_data)
        
        # Test chat history
        self.run_test("Get Chat History", "GET", "chat/history?limit=10", 200)
        
        return success

    def test_avatar_endpoints(self):
        """Test avatar endpoints"""
        print("\n" + "="*50)
        print("TESTING AVATAR ENDPOINTS")
        print("="*50)
        
        # Test get avatar config
        success, avatar_data = self.run_test("Get Avatar Config", "GET", "avatar", 200)
        
        # Test update avatar config
        update_data = {
            "face_preset": "sharp",
            "skin_tone": "tan",
            "hairstyle": "curly",
            "outfit": "formal",
            "strict_level": 7,
            "humor_level": 3,
            "verbosity_level": 6,
            "voice_type": "energetic"
        }
        self.run_test("Update Avatar Config", "PUT", "avatar", 200, update_data)
        
        return success

    def test_goals_endpoints(self):
        """Test goals endpoints"""
        print("\n" + "="*50)
        print("TESTING GOALS ENDPOINTS")
        print("="*50)
        
        # Test create goal
        goal_data = {"title": "Test Goal", "description": "This is a test goal", "category": "study"}
        success, goal_response = self.run_test("Create Goal", "POST", "goals", 200, goal_data)
        
        goal_id = None
        if success and 'id' in goal_response:
            goal_id = goal_response['id']
        
        # Test get goals
        self.run_test("Get Goals", "GET", "goals", 200)
        
        # Test update goal if we have an ID
        if goal_id:
            update_data = {"completed": True, "progress": 100}
            self.run_test("Update Goal", "PUT", f"goals/{goal_id}", 200, update_data)
            
            # Test delete goal
            self.run_test("Delete Goal", "DELETE", f"goals/{goal_id}", 200)
        
        return success

    def test_checkin_endpoints(self):
        """Test check-in endpoints"""
        print("\n" + "="*50)
        print("TESTING CHECK-IN ENDPOINTS")
        print("="*50)
        
        # Test create check-in
        checkin_data = {
            "working_on": "Testing the API endpoints",
            "energy_level": 8,
            "mood": "focused"
        }
        success, checkin_response = self.run_test("Create Check-in", "POST", "checkin", 200, checkin_data)
        
        # Test get latest check-in
        self.run_test("Get Latest Check-in", "GET", "checkin/latest", 200)
        
        # Test get check-in history
        self.run_test("Get Check-in History", "GET", "checkin/history?limit=10", 200)
        
        return success

    def test_stats_endpoint(self):
        """Test stats endpoint"""
        print("\n" + "="*50)
        print("TESTING STATS ENDPOINT")
        print("="*50)
        
        success, stats_data = self.run_test("Get User Stats", "GET", "stats", 200)
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Bhaiya AI Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🔑 Session Token: {self.session_token[:20]}...")
        print(f"👤 User ID: {self.user_id}")
        
        # Test root endpoint first
        print("\n" + "="*50)
        print("TESTING ROOT ENDPOINT")
        print("="*50)
        self.test_root_endpoint()
        
        # Test all endpoint groups
        auth_success = self.test_auth_endpoints()
        if not auth_success:
            print("⚠️  Authentication failed - some tests may not work properly")
        
        self.test_chat_endpoints()
        self.test_avatar_endpoints()
        self.test_goals_endpoints()
        self.test_checkin_endpoints()
        self.test_stats_endpoint()
        
        # Print final results
        print("\n" + "="*60)
        print("📊 FINAL TEST RESULTS")
        print("="*60)
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n🔍 Failed Tests Details:")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"\n{i}. {failure['test']}")
                print(f"   Endpoint: {failure['endpoint']}")
                if 'expected' in failure:
                    print(f"   Expected: {failure['expected']}, Got: {failure['actual']}")
                print(f"   Error: {failure['error']}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = BhaiyaAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {len(tester.failed_tests)} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())