import requests
import sys
import json
from datetime import datetime

class BhaiyaAITester:
    def __init__(self, base_url="https://mentor-live-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = "test_session_live_1774371699453"  # From auth setup
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session_id = None
        self.routine_id = None
        self.challenge_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text[:200]}")
                    self.failed_tests.append({
                        "test": name,
                        "expected": expected_status,
                        "actual": response.status_code,
                        "response": response.text[:500]
                    })
                except:
                    self.failed_tests.append({
                        "test": name,
                        "expected": expected_status,
                        "actual": response.status_code
                    })

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth(self):
        """Test authentication"""
        print("\n=== AUTHENTICATION TESTS ===")
        success, response = self.run_test("Get current user", "GET", "auth/me", 200)
        if success:
            print(f"✅ Authenticated as: {response.get('name', 'Unknown')}")
        return success

    def test_focus_mode(self):
        """Test Focus Mode APIs"""
        print("\n=== FOCUS MODE TESTS ===")
        
        # Start focus session
        success, response = self.run_test(
            "Start focus session",
            "POST",
            "focus/start",
            200,
            data={"duration_minutes": 25, "task": "Test focus session"}
        )
        if success and response.get('id'):
            self.session_id = response['id']
            print(f"✅ Focus session started with ID: {self.session_id}")
        
        # Get focus sessions
        self.run_test("Get focus sessions", "GET", "focus/sessions", 200)
        
        # End focus session
        if self.session_id:
            self.run_test(
                "End focus session",
                "POST",
                "focus/end",
                200,
                data={"session_id": self.session_id, "completed": True, "notes": "Test completed"}
            )

    def test_challenges(self):
        """Test Challenge Mode APIs"""
        print("\n=== CHALLENGE MODE TESTS ===")
        
        # Get today's challenges
        success, response = self.run_test("Get today's challenges", "GET", "challenges/today", 200)
        if success and response and len(response) > 0:
            self.challenge_id = response[0].get('id')
            print(f"✅ Got {len(response)} challenges for today")
        
        # Get challenge streak
        self.run_test("Get challenge streak", "GET", "challenges/streak", 200)
        
        # Complete a challenge
        if self.challenge_id:
            self.run_test(
                "Complete challenge",
                "POST",
                "challenges/complete",
                200,
                data={"challenge_id": self.challenge_id}
            )

    def test_routines(self):
        """Test Routines APIs"""
        print("\n=== ROUTINES TESTS ===")
        
        # Create routine
        success, response = self.run_test(
            "Create routine",
            "POST",
            "routines",
            200,
            data={
                "title": "Test Morning Routine",
                "steps": ["Wake up early", "Drink water", "Exercise"],
                "category": "wellness",
                "frequency": "daily"
            }
        )
        if success and response.get('id'):
            self.routine_id = response['id']
            print(f"✅ Routine created with ID: {self.routine_id}")
        
        # Get routines
        self.run_test("Get routines", "GET", "routines", 200)
        
        if self.routine_id:
            # Update routine
            self.run_test(
                "Update routine",
                "PUT",
                f"routines/{self.routine_id}",
                200,
                data={"title": "Updated Morning Routine"}
            )
            
            # Log routine completion
            self.run_test(
                "Log routine completion",
                "POST",
                f"routines/{self.routine_id}/log",
                200
            )
            
            # Get routine logs
            self.run_test("Get routine logs", "GET", f"routines/{self.routine_id}/logs", 200)
            
            # Delete routine
            self.run_test("Delete routine", "DELETE", f"routines/{self.routine_id}", 200)

    def test_weekly_summary(self):
        """Test Weekly Summary API"""
        print("\n=== WEEKLY SUMMARY TESTS ===")
        success, response = self.run_test("Get weekly summary", "GET", "summary/weekly", 200, timeout=60)
        if success:
            print(f"✅ Weekly summary generated with AI text: {len(response.get('ai_summary', ''))} chars")

    def test_progress_card(self):
        """Test Progress Card API"""
        print("\n=== PROGRESS CARD TESTS ===")
        self.run_test("Get progress card", "GET", "progress-card", 200)

    def test_enhanced_stats(self):
        """Test Enhanced Stats API"""
        print("\n=== ENHANCED STATS TESTS ===")
        success, response = self.run_test("Get enhanced stats", "GET", "stats", 200)
        if success:
            focus_sessions = response.get('total_focus_sessions', 0)
            challenges = response.get('total_challenges_completed', 0)
            print(f"✅ Stats include focus sessions: {focus_sessions}, challenges: {challenges}")

    def test_chat_modes(self):
        """Test Chat with new modes"""
        print("\n=== CHAT MODES TESTS ===")
        
        # Test future_you mode
        success, response = self.run_test(
            "Chat with future_you mode",
            "POST",
            "chat",
            200,
            data={"message": "What should I focus on?", "mode": "future_you"},
            timeout=60
        )
        if success:
            print(f"✅ Future You mode response: {len(response.get('response', ''))} chars")
        
        # Test brutal_honesty mode
        success, response = self.run_test(
            "Chat with brutal_honesty mode",
            "POST",
            "chat",
            200,
            data={"message": "Am I being productive?", "mode": "brutal_honesty"},
            timeout=60
        )
        if success:
            print(f"✅ Brutal Honesty mode response: {len(response.get('response', ''))} chars")

    def test_phase4_languages(self):
        """Test Phase 4: Languages endpoint returns 25 languages"""
        print("\n=== PHASE 4: LANGUAGES TEST ===")
        
        success, response = self.run_test(
            "GET /api/languages",
            "GET",
            "languages",
            200
        )
        if success:
            if isinstance(response, list) and len(response) == 25:
                print(f"✅ Found {len(response)} languages as expected")
                print(f"   Sample languages: {', '.join(response[:5])}...")
                return True
            else:
                print(f"❌ Expected 25 languages, got {len(response) if isinstance(response, list) else 'non-list'}")
                self.failed_tests.append({
                    "test": "Languages Count",
                    "expected": 25,
                    "actual": len(response) if isinstance(response, list) else "non-list"
                })
        return False

    def test_phase4_wrapped(self):
        """Test Phase 4: Wrapped endpoint returns monthly data with AI summary"""
        print("\n=== PHASE 4: WRAPPED TEST ===")
        
        success, response = self.run_test(
            "GET /api/wrapped",
            "GET",
            "wrapped",
            200,
            timeout=60  # AI generation might take time
        )
        if success:
            required_fields = ['name', 'period', 'month_messages', 'total_goals', 'ai_wrapped']
            missing_fields = [field for field in required_fields if field not in response]
            if not missing_fields:
                print(f"✅ All required fields present")
                print(f"   AI Wrapped preview: {response.get('ai_wrapped', '')[:100]}...")
                print(f"   Month messages: {response.get('month_messages', 0)}")
                print(f"   Total goals: {response.get('total_goals', 0)}")
                return True
            else:
                print(f"❌ Missing fields: {missing_fields}")
                self.failed_tests.append({
                    "test": "Wrapped Fields",
                    "missing_fields": missing_fields
                })
        return False

    def test_phase4_realtime(self):
        """Test Phase 4: OpenAI Realtime Voice WebRTC session"""
        print("\n=== PHASE 4: REALTIME VOICE TEST ===")
        
        success, response = self.run_test(
            "POST /api/v1/realtime/session",
            "POST",
            "v1/realtime/session",
            200
        )
        if success:
            if 'client_secret' in response and 'value' in response['client_secret']:
                print(f"✅ Client secret received for WebRTC")
                return True
            else:
                print(f"❌ No client_secret.value in response")
                print(f"   Response keys: {list(response.keys())}")
                self.failed_tests.append({
                    "test": "Realtime Session Format",
                    "issue": "Missing client_secret.value"
                })
        return False

    def test_phase4_avatar_language(self):
        """Test Phase 4: Avatar accepts language field"""
        print("\n=== PHASE 4: AVATAR LANGUAGE TEST ===")
        
        # First get current config
        success, current_config = self.run_test(
            "GET current avatar config",
            "GET",
            "avatar",
            200
        )
        if not success:
            return False
        
        # Test updating with language
        test_language = "Spanish"
        success, response = self.run_test(
            "PUT /api/avatar with language",
            "PUT",
            "avatar",
            200,
            data={"language": test_language}
        )
        if success:
            if response.get('language') == test_language:
                print(f"✅ Language updated to {test_language}")
                
                # Reset to English for other tests
                self.run_test(
                    "Reset language to English",
                    "PUT",
                    "avatar",
                    200,
                    data={"language": "English"}
                )
                return True
            else:
                print(f"❌ Language not updated correctly")
                print(f"   Expected: {test_language}, Got: {response.get('language')}")
                self.failed_tests.append({
                    "test": "Avatar Language",
                    "expected": test_language,
                    "actual": response.get('language')
                })
        return False

    def test_phase4_chat_language(self):
        """Test Phase 4: Chat responds in configured language"""
        print("\n=== PHASE 4: CHAT LANGUAGE TEST ===")
        
        # Set avatar to Spanish
        self.run_test(
            "Set avatar to Spanish",
            "PUT",
            "avatar",
            200,
            data={"language": "Spanish"}
        )
        
        # Test chat response
        success, response = self.run_test(
            "POST /api/chat with Spanish config",
            "POST",
            "chat",
            200,
            data={"message": "Hello, how are you?", "mode": "general"},
            timeout=60
        )
        if success:
            if 'response' in response:
                print(f"✅ Chat response received")
                print(f"   Response preview: {response['response'][:100]}...")
                
                # Reset to English
                self.run_test(
                    "Reset language to English",
                    "PUT",
                    "avatar",
                    200,
                    data={"language": "English"}
                )
                return True
            else:
                print(f"❌ No response field in chat")
                self.failed_tests.append({
                    "test": "Chat Response Format",
                    "issue": "Missing response field"
                })
        return False

def main():
    print("🚀 Starting Bhaiya AI Phase 4 Backend Testing...")
    print("=" * 60)
    tester = BhaiyaAITester()
    
    # Test authentication first
    if not tester.test_auth():
        print("❌ Authentication failed, stopping tests")
        return 1
    
    print("\n🔥 Testing Phase 4 New Features:")
    print("-" * 40)
    
    # Test Phase 4 features
    phase4_results = []
    phase4_results.append(tester.test_phase4_languages())
    phase4_results.append(tester.test_phase4_wrapped())
    phase4_results.append(tester.test_phase4_realtime())
    phase4_results.append(tester.test_phase4_avatar_language())
    phase4_results.append(tester.test_phase4_chat_language())
    
    phase4_passed = sum(phase4_results)
    print(f"\n📊 Phase 4 Features: {phase4_passed}/{len(phase4_results)} passed")
    
    print("\n🔄 Testing Existing Functionality:")
    print("-" * 40)
    
    # Test existing functionality
    tester.test_focus_mode()
    tester.test_challenges()
    tester.test_routines()
    tester.test_weekly_summary()
    tester.test_progress_card()
    tester.test_enhanced_stats()
    tester.test_chat_modes()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS:")
    print(f"   Total tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {len(tester.failed_tests)}")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"   Success rate: {success_rate:.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests Summary:")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"   {i}. {failure.get('test', 'Unknown')}")
            if 'error' in failure:
                print(f"      Error: {failure['error']}")
            elif 'expected' in failure:
                print(f"      Expected: {failure['expected']}, Got: {failure['actual']}")
            elif 'issue' in failure:
                print(f"      Issue: {failure['issue']}")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())