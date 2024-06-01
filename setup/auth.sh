# Use Touch ID to authorize sudo

if [ ! -f /etc/pam.d/sudo_local ]; then
  echo "auth       sufficient     pam_tid.so" | sudo tee /etc/pam.d/sudo_local
fi
