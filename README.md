# Devout

Devout is a **WIP** NodeJS build tool created with devotion for library developers who are
passionate about their craft. It aims to elevate your development experience by automating project
setup and common build procedures, allowing you to focus on creating outstanding code rather than
managing repetitive tasks.

## Features

- Quickly set up your project structure with predefined templates and configurations.
- Compile and bundle your library with ease, specifying output directories and handling all build
  steps automatically.
- Effortlessly remove build artifacts and reset your project state with a single command.
- Uses esbuild under the hood for lightning-quick compilation and bundling of TypeScript code.
- Uses dts-bundle-generator for generation of TypeScript declaration types.
- Uses sass for compilation of SCSS styles.

## Motivation

The motivation behind creating Devout stems from a desire to eliminate the repetitive and
time-consuming tasks associated with setting up new projects. As a developer, I found myself
constantly going through the same steps to configure each project, which led to much frustration and
wasted time. I wanted a tool that "just worked," especially with TypeScript, requiring minimal to no
setup. Devout was born out of this need to streamline the development process, providing a seamless
and efficient way to initialize, build, and clean projects with a single command-line
interface. While Devout was designed to meet my personal needs, it may not work for everyone, and it
is still in its early stages of development.

## Installation

To install Devout, simply add it to your project using npm:

```sh
npm install -D devout
```

## Usage

Devout provides a command-line interface to manage your project. The following commands are
available:

### Initialize the Project

Sets up your project with the necessary structure and configuration.

```sh
npx devout init
```

### Build the Project

Compiles and bundles your library, with options to specify the output directory.

```sh
npx devout build -o <path>
```

By default, the output directory is set to `dist`.

### Clean the Project

Removes all build artifacts, allowing you to reset your project state.

```sh
npx devout clean
```

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and
create. All contributions are greatly appreciated.

## License

Distributed under the MIT License. See LICENSE for more information.
