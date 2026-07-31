const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = (env, argv) => ({
  entry: {
    taskpane: "./src/taskpane/taskpane.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  resolve: { extensions: [".ts", ".tsx", ".js"] },
  module: {
    rules: [
      { test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: "taskpane.html",
      template: "./src/taskpane/taskpane.html",
      chunks: ["taskpane"],
    }),
    new CopyPlugin({
      patterns: [{ from: "assets", to: "assets" }],
    }),
  ],
  devServer: {
    port: 3001,
    https: true,
    hot: true,
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  devtool: argv.mode === "development" ? "source-map" : false,
});
