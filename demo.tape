Hide
Sleep 3s

# Where should we write the GIF?

Output demo.gif

# Set up a 1200x600 terminal with 46px font.
# Set FontSize 46
Set Width 1200
Set Height 600

Type "mkdir ~/repos && cd ~/repos"
Enter

Type "git clone https://github.com/git-truck/git-truck"
Enter

Sleep 15s

Type "cd ~ && clear"
Enter

Show

Type@150ms "cd ~/repos"
Enter

Sleep 500ms

# Type a command in the terminal.
Type@150ms "npx git-truck"

Sleep 500ms

Left@250ms 9

Sleep 500ms

Type@750ms "-y "

Sleep 1500ms

Right@250ms 9

# Pause for dramatic effect...
Sleep 1500ms

# Run the command by pressing enter.
Enter

# Admire the output for a bit.
Sleep 20s
