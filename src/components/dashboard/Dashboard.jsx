import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import {
  MedicationOutlined,
  AssessmentOutlined,
  AccountCircle,
  LogoutOutlined,
  ExitToApp,
} from "@mui/icons-material";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convexClient";
import { useAuth } from "../auth/AuthContext";

const Dashboard = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);
  const { user, logout: authLogout, sessionId } = useAuth();

  // Move these inside the component function
  const [markAsTakenDialogOpen, setMarkAsTakenDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [notes, setNotes] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const medications = useQuery(
    api.medications.getMedications,
    user ? { userId: user._id } : "skip"
  );
  const reports = useQuery(
    api.reports.getReports,
    user ? { userId: user._id } : "skip"
  );

  const logoutMutation = useMutation(api.auth.logout);
  const logoutAll = useMutation(api.auth.logoutAll);
  const logoutOthers = useMutation(api.auth.logoutOthers);
  const markMedicationAsDone = useMutation(
    api.medications.markMedicationAsDone
  );

  // Move these handler functions inside the component
  const handleMarkAsTakenClick = (medication) => {
    setSelectedMedication(medication);
    setNotes("");
    setMarkAsTakenDialogOpen(true);
  };

  const handleMarkAsTakenConfirm = async () => {
    if (!selectedMedication) return;

    try {
      await markMedicationAsDone({
        medicationId: selectedMedication._id,
        userId: user._id,
        notes: notes,
      });
      setSnackbarMessage("Medication marked as taken");
      setSnackbarSeverity("success");
    } catch (error) {
      console.error("Error marking medication as taken:", error);
      setSnackbarMessage("Error marking medication as taken: " + error.message);
      setSnackbarSeverity("error");
    }

    setSnackbarOpen(true);
    setMarkAsTakenDialogOpen(false);
    setSelectedMedication(null);
  };

  const handleMarkAsTakenCancel = () => {
    setMarkAsTakenDialogOpen(false);
    setSelectedMedication(null);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logoutMutation({ sessionId });
      authLogout(); // Clear local storage and context
    } catch (error) {
      console.error("Logout failed:", error);
    }
    handleMenuClose();
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAll({ sessionId });
      authLogout(); // Clear local storage and context
    } catch (error) {
      console.error("Logout from all devices failed:", error);
    }
    handleMenuClose();
  };

  const handleLogoutOthers = async () => {
    try {
      await logoutOthers({ sessionId });
      // Stay logged in on current device
    } catch (error) {
      console.error("Logout from other devices failed:", error);
    }
    handleMenuClose();
  };

  // Today's medications
  const todayMedications = medications?.filter((med) => {
    if (med.reminderType === "one-time") {
      const medicationDate = new Date(med.reminderDate);
      const today = new Date();
      return (
        medicationDate.getDate() === today.getDate() &&
        medicationDate.getMonth() === today.getMonth() &&
        medicationDate.getFullYear() === today.getFullYear() &&
        !med.isCompleted
      );
    } else if (med.reminderType === "recurring") {
      const today = new Date();
      const startDate = new Date(med.startDate);
      const endDate = new Date(med.endDate);

      // Check if today is within the date range
      if (today < startDate || today > endDate) {
        return false;
      }

      // For daily medication
      if (med.frequency === "daily") {
        return true;
      }

      // For weekly medication
      if (med.frequency === "weekly") {
        const daysOfWeek = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        return daysOfWeek[today.getDay()] === med.dayOfWeek;
      }
    }
    return false;
  });

  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      keepMounted
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <ExitToApp fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleLogoutAll}>
        <ListItemIcon>
          <LogoutOutlined fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout from all devices</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleLogoutOthers}>
        <ListItemIcon>
          <LogoutOutlined fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout from other devices</ListItemText>
      </MenuItem>
    </Menu>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Health & Wellness
          </Typography>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
        </Toolbar>
      </AppBar>
      {renderMenu}

      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Hello, {user?.name}
        </Typography>

        <Grid container spacing={3}>
          {/* Today's Medications */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Today's Medications</Typography>
                  <Button
                    component={RouterLink}
                    to="/add-medication"
                    variant="contained"
                    startIcon={<MedicationOutlined />}
                  >
                    Add Medication
                  </Button>
                </Box>

                {todayMedications?.length > 0 ? (
                  <List>
                    {todayMedications.map((med) => (
                      <React.Fragment key={med._id}>
                        <ListItem>
                          <ListItemIcon>
                            <MedicationOutlined />
                          </ListItemIcon>
                          <ListItemText
                            primary={med.medicineName}
                            secondary={
                              med.reminderType === "one-time"
                                ? `Time: ${med.reminderTime}`
                                : `Frequency: ${med.frequency === "daily" ? "Daily" : `Weekly (${med.dayOfWeek})`}`
                            }
                          />
                          <Button
                            variant="outlined"
                            size="small"
                            color="primary"
                            onClick={() => handleMarkAsTakenClick(med)}
                          >
                            Mark as Taken
                          </Button>
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography color="textSecondary">
                    No medications scheduled for today
                  </Typography>
                )}

                <Box
                  sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}
                >
                  <Button
                    component={RouterLink}
                    to="/medications"
                    color="primary"
                  >
                    View All Medications
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Reports */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Recent Reports</Typography>
                  <Button
                    component={RouterLink}
                    to="/reports"
                    variant="contained"
                    startIcon={<AssessmentOutlined />}
                  >
                    Generate Report
                  </Button>
                </Box>

                {reports?.length > 0 ? (
                  <List>
                    {reports.slice(0, 5).map((report) => (
                      <React.Fragment key={report._id}>
                        <ListItem>
                          <ListItemIcon>
                            <AssessmentOutlined />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Report`}
                            secondary={new Date(
                              report.generatedAt
                            ).toLocaleDateString()}
                          />
                          {report.reportUrl && (
                            <Button
                              variant="outlined"
                              size="small"
                              color="primary"
                              href={report.reportUrl}
                              target="_blank"
                            >
                              Download
                            </Button>
                          )}
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography color="textSecondary">
                    No reports generated yet
                  </Typography>
                )}

                <Box
                  sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}
                >
                  <Button component={RouterLink} to="/reports" color="primary">
                    View All Reports
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Mark as Taken Dialog - move outside the map function */}
      <Dialog open={markAsTakenDialogOpen} onClose={handleMarkAsTakenCancel}>
        <DialogTitle>Mark as Taken</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Confirm that you've taken "{selectedMedication?.medicineName}". You
            can add optional notes below.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="notes"
            label="Notes (optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMarkAsTakenCancel}>Cancel</Button>
          <Button
            onClick={handleMarkAsTakenConfirm}
            color="primary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications - move outside the map function */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Dashboard;
