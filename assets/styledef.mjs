export const ui = `
html, body {
  font-family: "Segoe UI", "Yu Gothic UI", "Meiryo UI", "MS UI Gothic", monospace;
  font-size: 9pt;
  color: #000;
  background: #FFF;
  -webkit-user-select: none; /* for Safari 3+, Safari on iOS 3+ */
  user-select: none;
  cursor: default;
}
button {
  font-family: inherit;
  font-size: inherit;
}
`

export const fullscreen = `
.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  outline: none;
}
`

export const flex = `
.flex.row {
  display: flex;
}
.flex.column {
  display: flex;
  flex-direction: column;
}
ul.flex.row, ul.flex.column {
  margin: 0;
  padding: 0;
  list-style-type: none;
}
.flex.row > *, .flex.column > * {
  flex: none;
}
.flex.fit {
  flex: auto;
}
`
