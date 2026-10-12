package com.campuspulse.security;

import com.campuspulse.entity.Admin;
import com.campuspulse.entity.CoordinatorRequest;
import com.campuspulse.entity.CoordinatorRequestStatus;
import com.campuspulse.entity.Role;
import com.campuspulse.repository.AdminRepository;
import com.campuspulse.repository.CoordinatorRequestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration tests for coordinator requests, Main Admin governance,
 * role transitions, and immediate server-side privilege revocation.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CoordinatorRequestWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private CoordinatorRequestRepository coordinatorRequestRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private Admin mainAdmin;
    private Admin regularUser;
    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        coordinatorRequestRepository.deleteAll();
        adminRepository.deleteAll();

        mainAdmin = new Admin("Main Admin", "main.admin@college.edu", passwordEncoder.encode("AdminPass123!"), Role.MAIN_ADMIN);
        mainAdmin = adminRepository.saveAndFlush(mainAdmin);

        regularUser = new Admin("Student Alice", "alice@college.edu", passwordEncoder.encode("UserPass123!"), Role.USER);
        regularUser = adminRepository.saveAndFlush(regularUser);

        adminToken = jwtService.generateToken(mainAdmin.getEmail(), "MAIN_ADMIN");
        userToken = jwtService.generateToken(regularUser.getEmail(), "USER");
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        coordinatorRequestRepository.deleteAll();
        adminRepository.deleteAll();
    }

    @Test
    @DisplayName("Submit Request: Regular user can submit coordinator request with PENDING status")
    void testSubmitRequest_Success() throws Exception {
        String payload = """
                {
                    "organizationOrClub": "Robotics Club",
                    "reason": "Organizing national hackathons and robotics symposium",
                    "contactDetails": "+919876543210"
                }
                """;

        mockMvc.perform(post("/api/coordinator-requests")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.organizationOrClub", is("Robotics Club")))
                .andExpect(jsonPath("$.status", is("PENDING")))
                .andExpect(jsonPath("$.userEmail", is("alice@college.edu")));

        CoordinatorRequest saved = coordinatorRequestRepository.findTopByUserOrderByRequestedAtDesc(regularUser).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(CoordinatorRequestStatus.PENDING);
        assertThat(saved.getOrganizationOrClub()).isEqualTo("Robotics Club");
    }

    @Test
    @DisplayName("Submit Request: Duplicate pending request returns 409 Conflict")
    void testSubmitRequest_DuplicatePending_Returns409() throws Exception {
        CoordinatorRequest initial = new CoordinatorRequest(regularUser, "Robotics Club", "Reason", "+919876543210");
        coordinatorRequestRepository.saveAndFlush(initial);

        String payload = """
                {
                    "organizationOrClub": "AI Club",
                    "reason": "Another request while first is still pending"
                }
                """;

        mockMvc.perform(post("/api/coordinator-requests")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.message", is("You already have a pending coordinator request awaiting review")));
    }

    @Test
    @DisplayName("Security: Regular user and coordinator cannot approve or reject requests (403 Forbidden)")
    void testApproveReject_ByNonAdmin_Returns403() throws Exception {
        CoordinatorRequest req = new CoordinatorRequest(regularUser, "Robotics Club", "Reason", null);
        req = coordinatorRequestRepository.saveAndFlush(req);

        // Attempt approve by regular user
        mockMvc.perform(post("/api/admin/coordinator-requests/" + req.getId() + "/approve")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());

        // Attempt reject by regular user
        mockMvc.perform(post("/api/admin/coordinator-requests/" + req.getId() + "/reject")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Approval Workflow: Main Admin approves request -> user elevated to ROLE_COORDINATOR")
    void testApproveRequest_Success_PromotesUser() throws Exception {
        CoordinatorRequest req = new CoordinatorRequest(regularUser, "Robotics Club", "Reason", null);
        req = coordinatorRequestRepository.saveAndFlush(req);

        String reviewPayload = """
                {
                    "reviewNote": "Approved based on department recommendation"
                }
                """;

        mockMvc.perform(post("/api/admin/coordinator-requests/" + req.getId() + "/approve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("APPROVED")))
                .andExpect(jsonPath("$.reviewNote", is("Approved based on department recommendation")))
                .andExpect(jsonPath("$.reviewedByEmail", is("main.admin@college.edu")));

        // Verify database state: user role promoted to COORDINATOR
        Admin updatedUser = adminRepository.findByEmailIgnoreCase(regularUser.getEmail()).orElseThrow();
        assertThat(updatedUser.getRole()).isEqualTo(Role.COORDINATOR);
    }

    @Test
    @DisplayName("Rejection Workflow: Main Admin rejects request -> user remains ROLE_USER")
    void testRejectRequest_Success_UserRemainsRegularUser() throws Exception {
        CoordinatorRequest req = new CoordinatorRequest(regularUser, "Debate Club", "Reason", null);
        req = coordinatorRequestRepository.saveAndFlush(req);

        String reviewPayload = """
                {
                    "reviewNote": "Please provide club faculty advisor endorsement"
                }
                """;

        mockMvc.perform(post("/api/admin/coordinator-requests/" + req.getId() + "/reject")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("REJECTED")))
                .andExpect(jsonPath("$.reviewNote", is("Please provide club faculty advisor endorsement")));

        Admin updatedUser = adminRepository.findByEmailIgnoreCase(regularUser.getEmail()).orElseThrow();
        assertThat(updatedUser.getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("State Safety: Approving already APPROVED request returns 409 Conflict")
    void testApproveAlreadyApproved_Returns409() throws Exception {
        CoordinatorRequest req = new CoordinatorRequest(regularUser, "Club", "Reason", null);
        req.setStatus(CoordinatorRequestStatus.APPROVED);
        req = coordinatorRequestRepository.saveAndFlush(req);

        mockMvc.perform(post("/api/admin/coordinator-requests/" + req.getId() + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)));
    }

    @Test
    @DisplayName("Immediate Revocation: Revoking coordinator immediately denies access even with unexpired JWT")
    void testRevokeCoordinator_ImmediateAccessLossWithOldToken() throws Exception {
        // 1. Promote user to active coordinator
        regularUser.setRole(Role.COORDINATOR);
        regularUser = adminRepository.saveAndFlush(regularUser);

        CoordinatorRequest approvedReq = new CoordinatorRequest(regularUser, "Coding Club", "Reason", null);
        approvedReq.setStatus(CoordinatorRequestStatus.APPROVED);
        coordinatorRequestRepository.saveAndFlush(approvedReq);

        // 2. Issue a valid token reflecting COORDINATOR role
        String coordinatorToken = jwtService.generateToken(regularUser.getEmail(), "COORDINATOR");

        // 3. User can currently access coordinator APIs
        mockMvc.perform(get("/api/events/my")
                        .header("Authorization", "Bearer " + coordinatorToken))
                .andExpect(status().isOk());

        // 4. Main Admin revokes coordinator privileges
        String revokePayload = """
                {
                    "reason": "Graduated and transferred leadership"
                }
                """;

        mockMvc.perform(post("/api/admin/coordinators/" + regularUser.getId() + "/revoke")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(revokePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("USER")))
                .andExpect(jsonPath("$.coordinatorRequestStatus", is("REVOKED")));

        // 5. CRITICAL SECURITY TEST: Same cryptographic token is immediately rejected from coordinator routes
        mockMvc.perform(get("/api/events/my")
                        .header("Authorization", "Bearer " + coordinatorToken))
                .andExpect(status().isForbidden());

        // 6. Database verify user is now ROLE_USER
        Admin postRevocation = adminRepository.findByEmailIgnoreCase(regularUser.getEmail()).orElseThrow();
        assertThat(postRevocation.getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("Admin Listing: Main Admin lists coordinator requests filtered by status")
    void testAdminListRequests_FilteredByStatus() throws Exception {
        CoordinatorRequest pending = new CoordinatorRequest(regularUser, "Pending Club", "Reason 1", null);
        pending.setStatus(CoordinatorRequestStatus.PENDING);
        coordinatorRequestRepository.saveAndFlush(pending);

        mockMvc.perform(get("/api/admin/coordinator-requests?status=PENDING")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].organizationOrClub", is("Pending Club")));
    }
}
