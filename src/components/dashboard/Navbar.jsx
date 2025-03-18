import React, { useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Box,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  AccountCircle,
  ExitToApp,
  LogoutOutlined,
  Home as HomeIcon,
  MedicationOutlined,
  AssessmentOutlined,
} from "@mui/icons-material";
import { useMutation } from "convex/react";
import { api } from "../../convexClient";
import { useAuth } from "../auth/AuthContext";

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);
  const { user, logout: authLogout, sessionId } = useAuth();
  const location = useLocation();

  const logoutMutation = useMutation(api.auth.logout);
  const logoutAll = useMutation(api.auth.logoutAll);
  const logoutOthers = useMutation(api.auth.logoutOthers);

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
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              alignItems: "center",
            }}
          >
            Health & Wellness
          </Typography>

          <Box sx={{ flexGrow: 1, display: "flex", ml: 4 }}>
            <Button
              component={RouterLink}
              to="/"
              color="inherit"
              startIcon={<HomeIcon />}
              sx={{
                mr: 2,
                bgcolor:
                  location.pathname === "/"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "transparent",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.25)",
                },
              }}
            >
              Dashboard
            </Button>

            <Button
              component={RouterLink}
              to="/medications"
              color="inherit"
              startIcon={<MedicationOutlined />}
              sx={{
                mr: 2,
                bgcolor:
                  location.pathname === "/medications"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "transparent",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.25)",
                },
              }}
            >
              Medications
            </Button>

            <Button
              component={RouterLink}
              to="/reports"
              color="inherit"
              startIcon={<AssessmentOutlined />}
              sx={{
                bgcolor:
                  location.pathname === "/reports"
                    ? "rgba(255, 255, 255, 0.15)"
                    : "transparent",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.25)",
                },
              }}
            >
              Reports
            </Button>
          </Box>

          {user && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                {user.name}
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
            </Box>
          )}
        </Toolbar>
      </AppBar>
      {renderMenu}
    </>
  );
};

export default Navbar;
