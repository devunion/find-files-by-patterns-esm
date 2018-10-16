import { assert } from "chai";
import chai = require("chai");
import chaiAsPromised = require("chai-as-promised");

import * as mock from "mock-fs";
import { resolve } from "path";

import { findAllFiles, Matcher, ofBasename } from "../src";

chai.use(chaiAsPromised);

describe("findAllFiles", () => {
  beforeEach(() => {
    mock(
      {
        "/home/user": {
          files: {
            "file.md": "",
            "file.html": "",
            _a: "",
            _b: "",
            _c: "",
          },
          "other-folder": {
            files: mock.symlink({
              path: "/home/user/files",
            }),
          },
          "symbolic-files": {
            "file.json": "",
            "file.html": mock.symlink({
              path: "/home/user/files/file.html",
            }),
          },
          "symbolic-folder": mock.symlink({
            path: "/home/user/files",
          }),
        },
        [process.cwd()]: {
          "file.html": mock.symlink({
            path: "/home/user/files/file.html",
          }),
          "file.csv": "",
          "file.yml": "",
          files: mock.symlink({
            path: "/home/user/files",
          }),
        },
      },
      {
        createCwd: false,
        createTmp: false,
      },
    );
  });
  afterEach(() => {
    mock.restore();
  });
  describe("Asynchronous", () => {
    describe("(...tests: Matcher[]): Promise<Set<string>>", () => {
      it("should arbitrarily resolve to an empty set if no arguments are provided", () => {
        return assert.eventually.isEmpty(findAllFiles());
      });
      it("should arbitrarily resolve to an empty set if only an empty set of tests is provided", () => {
        const tests: Matcher[] = [];
        return assert.eventually.isEmpty(findAllFiles(...tests));
      });
      it("should search in the current working directory", () => {
        return assert.eventually.deepEqual(
          findAllFiles(ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
      });
      it("should return a found directory's path", () => {
        return assert.eventually.deepEqual(
          findAllFiles(ofBasename("files")),
          new Set([resolve("./files")]),
        );
      });
      it("should return a found file's path", () => {
        return assert.eventually.deepEqual(
          findAllFiles(ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
      });
      it("should return a set with one file's path if there is only one matching file in the current working directory", () => {
        return assert.eventually.deepEqual(
          findAllFiles(ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
      });
      it("should return a set of matching files in the current working directory", () => {
        return Promise.all([
          assert.eventually.notEqual(
            findAllFiles(ofBasename(/^file\./)),
            new Set([
              resolve("./file.csv"),
              resolve("./file.yml"),
              resolve("./file.html"),
            ]),
          ),
          assert.eventually.deepEqual(
            findAllFiles(ofBasename(/^file\./)),
            new Set([
              resolve("./file.csv"),
              resolve("./file.html"),
              resolve("./file.yml"),
            ]),
          ),
        ]);
      });
      it("should return a sorted set of matching files in the current working directory", () => {
        return assert.eventually.deepEqual(
          findAllFiles(ofBasename(/^file\./)),
          new Set([
            resolve("./file.csv"),
            resolve("./file.html"),
            resolve("./file.yml"),
          ]),
        );
      });
      it("should return an empty set if there are no matching files in the current working directory", () => {
        return assert.eventually.deepEqual(
          findAllFiles(ofBasename("file.json")),
          new Set([]),
        );
      });
      it("should be rejected if one of the tests throws an error", () => {
        return assert.isRejected(
          findAllFiles(
            (path: string): boolean => {
              throw new Error();
            },
          ),
        );
      });
    });
    describe("(directories: string | Iterable<string>, ...tests: Matcher[]): Promise<Set<string>>", () => {
      it("should arbitrarily resolve to an empty set if no arguments are provided", () => {
        return assert.eventually.isEmpty(findAllFiles());
      });
      it("should arbitrarily resolve to an empty set if only an empty set of directories is provided", () => {
        return assert.eventually.isEmpty(findAllFiles([]));
      });
      it("should arbitrarily resolve to an empty set if an empty set of directories is provided", () => {
        return assert.eventually.isEmpty(findAllFiles([], ofBasename()));
      });
      it("should arbitrarily resolve to an empty set if empty sets of directories and tests are provided", () => {
        return assert.eventually.isEmpty(findAllFiles([], ...[]));
      });
      it("should arbitrarily resolve to an empty set if there are no test to perform on files' path", () => {
        return assert.eventually.isEmpty(findAllFiles("./"));
      });
      it("should handle a directory specified with a string path", () => {
        return assert.eventually.deepEqual(
          findAllFiles("./", ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
      });
      it("should handle directories specified with string paths", () => {
        return assert.eventually.deepEqual(
          findAllFiles(["./", "./files"], ofBasename("file.html")),
          new Set([resolve("./file.html"), resolve("./files/file.html")]),
        );
      });
      it("should resolve directory paths which are not absolute relative to the current working directory", () => {
        return Promise.all([
          assert.eventually.deepEqual(
            findAllFiles("./", ofBasename("file.html")),
            new Set([resolve("./file.html")]),
          ),
          assert.eventually.deepEqual(
            findAllFiles("./files", ofBasename("file.html")),
            new Set([resolve("./files/file.html")]),
          ),
        ]);
      });
      it("should resolve to an empty set if there is no matching file in a directory", () => {
        return assert.eventually.isEmpty(
          findAllFiles("/home/user/files", ofBasename("inexistant.json")),
        );
      });
      it("should resolve to en empty set if there is no matching file in directories", () => {
        return assert.eventually.isEmpty(
          findAllFiles(
            ["/home/user/files", "/home/user/symbolic-files"],
            ofBasename("inexistant.json"),
          ),
        );
      });
      it("should return a found directory's path", () => {
        return assert.eventually.deepEqual(
          findAllFiles("./", ofBasename("files")),
          new Set([resolve("./files")]),
        );
      });
      it("should return a found file's path", () => {
        return assert.eventually.deepEqual(
          findAllFiles("./", ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
      });
      it("should resolve to a set with one file's path if there is only one matching file in a directory", () => {
        return assert.eventually.deepEqual(
          findAllFiles("/home/user/files", ofBasename("file.html")),
          new Set([resolve("/home/user/files/file.html")]),
        );
      });
      it("should resolve to a set with one file's path if there is only one matching file in a directory among the directories", () => {
        return assert.eventually.deepEqual(
          findAllFiles(
            ["/home/user/files", "/home/user/symbolic-files"],
            ofBasename("file.md"),
          ),
          new Set([resolve("/home/user/files/file.md")]),
        );
      });
      it("should resolve to a set of matching files' path in a directory", () => {
        return assert.eventually.deepEqual(
          findAllFiles("/home/user/files", ofBasename(/^file/)),
          new Set([
            resolve("/home/user/files/file.html"),
            resolve("/home/user/files/file.md"),
          ]),
        );
      });
      it("should resolve to a set of matching files' path in directories", () => {
        return assert.eventually.deepEqual(
          findAllFiles(
            ["/home/user/files", "/home/user/symbolic-files"],
            ofBasename("file.html"),
          ),
          new Set([
            resolve("/home/user/files/file.html"),
            resolve("/home/user/symbolic-files/file.html"),
          ]),
        );
      });
      it("should resolve to a set with one directory's path if there is only one matching file in a directory", () => {
        return assert.eventually.deepEqual(
          findAllFiles("/home/user", ofBasename("files")),
          new Set([resolve("/home/user/files")]),
        );
      });
      it("should resolve to a set with one directory's path if there is only one matching file in a directory among the directories", () => {
        return assert.eventually.deepEqual(
          findAllFiles(
            ["/home/user/files", "/home/user/"],
            ofBasename("files"),
          ),
          new Set([resolve("/home/user/files")]),
        );
      });
      it("should resolve to a set of matching directories' path in a directory", () => {
        return assert.eventually.deepEqual(
          findAllFiles("/home/user", ofBasename(/^files/, /files$/)),
          new Set([
            resolve("/home/user/files"),
            resolve("/home/user/symbolic-files"),
          ]),
        );
      });
      it("should resolve to a set of matching directories' path in directories", () => {
        return assert.eventually.deepEqual(
          findAllFiles(
            ["/home/user", "/home/user/other-folder"],
            ofBasename("files"),
          ),
          new Set([
            resolve("/home/user/files"),
            resolve("/home/user/other-folder/files"),
          ]),
        );
      });
      it("should resolve to a set of matching files and directories' path", () => {
        return assert.eventually.deepEqual(
          findAllFiles(["/home/user", "/home/user/files"], ofBasename(/^file/)),
          new Set([
            resolve("/home/user/files"),
            resolve("/home/user/files/file.md"),
            resolve("/home/user/files/file.html"),
          ]),
        );
      });
      it("should resolve to a sorted set of matching files in a directory", () => {
        return assert.eventually.deepEqual(
          findAllFiles("/home/user/files", ofBasename(/^_/)),
          new Set([
            resolve("/home/user/files/_a"),
            resolve("/home/user/files/_b"),
            resolve("/home/user/files/_c"),
          ]),
        );
      });
      it("should resolve to a set of sequences of matching files sorted by directory", () => {
        return assert.eventually.deepEqual(
          findAllFiles(
            ["/home/user/files", "/home/user/symbolic-folder"],
            ofBasename(/^_/),
          ),
          new Set([
            resolve("/home/user/files/_a"),
            resolve("/home/user/files/_b"),
            resolve("/home/user/files/_c"),
            resolve("/home/user/symbolic-folder/_a"),
            resolve("/home/user/symbolic-folder/_b"),
            resolve("/home/user/symbolic-folder/_c"),
          ]),
        );
      });
      it("should be rejected if any of the given directories does not exist", () => {
        return assert.isRejected(
          findAllFiles("./unexistant-folder", ofBasename("unexistant.html")),
        );
      });
      it("should be rejected if one of the tests throws an error", () => {
        return assert.isRejected(
          findAllFiles(
            "./",
            (path: string): boolean => {
              throw new Error();
            },
          ),
        );
      });
      it("should be rejected if one of the directories is a file", () => {
        return assert.isRejected(
          findAllFiles(["./", "./file.html"], ofBasename("unexistant.html")),
        );
      });
    });
  });
  describe("Synchronous", () => {
    describe("(...tests: Matcher[]): Set<string>", () => {
      it("should arbitrarily return an empty set if no arguments are provided", () => {
        assert.isEmpty(findAllFiles.sync());
      });
      it("should arbitrarily return an empty set if only an empty set of tests is provided", () => {
        const tests: Matcher[] = [];
        assert.isEmpty(findAllFiles.sync(...tests));
      });
      it("should search in the current working directory", () => {
        assert.deepEqual(
          findAllFiles.sync(ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
      });
      it("should return a found directory's path", () => {
        assert.deepEqual(
          findAllFiles.sync(ofBasename("files")),
          new Set([resolve("./files")]),
        );
      });
      it("should return a found file's path", () => {
        assert.deepEqual(
          findAllFiles.sync("./", ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
      });
      it("should return a set with one file's path if there is only one matching file in the current working directory", () => {
        assert.deepEqual(
          findAllFiles.sync(ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
      });
      it("should return a set of matching files in the current working directory", () => {
        const actualFiles = [...findAllFiles.sync(ofBasename(/^file\./))];
        for (const path of [
          resolve("./file.csv"),
          resolve("./file.yml"),
          resolve("./file.html"),
        ]) {
          assert.isTrue(actualFiles.includes(path));
        }
      });
      it("should return a sorted set of matching files in the current working directory", () => {
        assert.deepEqual(
          findAllFiles.sync(ofBasename(/^file\./)),
          new Set([
            resolve("./file.csv"),
            resolve("./file.html"),
            resolve("./file.yml"),
          ]),
        );
      });
      it("should return an empty set if there are no matching files in the current working directory", () => {
        assert.deepEqual(
          findAllFiles.sync(ofBasename("file.json")),
          new Set([]),
        );
      });
      it("should throw an error if one of the tests throws an error", () => {
        assert.throws(() =>
          findAllFiles.sync(
            (path: string): boolean => {
              throw new Error();
            },
          ),
        );
      });
    });
    describe("(directories: string | Iterable<string>, ...tests: Matcher[]): Set<string>", () => {
      it("should arbitrarily return an empty set if no arguments are provided", () => {
        assert.isEmpty(findAllFiles.sync());
      });
      it("should arbitrarily return an empty set if only an empty set of directories is provided", () => {
        const directories: string[] = [];
        assert.isEmpty(findAllFiles.sync(directories));
      });
      it("should arbitrarily return an empty set if an empty set of directories is provided", () => {
        assert.isEmpty(findAllFiles.sync([], ofBasename()));
      });
      it("should arbitrarily return an empty set if empty sets of directories and tests are provided", () => {
        assert.isEmpty(findAllFiles.sync([], ...[]));
      });
      it("should arbitrarily return an empty set if there are no tests to perform on files' path", () => {
        assert.isEmpty(findAllFiles.sync("./"));
      });
      it("should handle a directory specified with a string path", () => {
        assert.deepEqual(
          findAllFiles.sync("./", ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
      });
      it("should handle directories specified with string paths", () => {
        assert.deepEqual(
          findAllFiles.sync(["./", "./files"], ofBasename("file.html")),
          new Set([resolve("./file.html"), resolve("./files/file.html")]),
        );
      });
      it("should resolve directory paths which are not absolute relative to the current working directory", () => {
        assert.deepEqual(
          findAllFiles.sync("./", ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
        assert.deepEqual(
          findAllFiles.sync("./files", ofBasename("file.html")),
          new Set([resolve("./files/file.html")]),
        );
      });
      it("should return an empty set if there is no matching file in a directory", () => {
        assert.isEmpty(
          findAllFiles.sync("/home/user/files", ofBasename("inexistant.json")),
        );
      });
      it("should return en empty set if there is no matching file in directories", () => {
        assert.isEmpty(
          findAllFiles.sync(
            ["/home/user/files", "/home/user/symbolic-files"],
            ofBasename("inexistant.json"),
          ),
        );
      });
      it("should return a found directory's path", () => {
        assert.deepEqual(
          findAllFiles.sync("./", ofBasename("files")),
          new Set([resolve("./files")]),
        );
      });
      it("should return a found file's path", () => {
        assert.deepEqual(
          findAllFiles.sync("./", ofBasename("file.html")),
          new Set([resolve("./file.html")]),
        );
      });
      it("should return a set with one file's path if there is only one matching file in a directory", () => {
        assert.deepEqual(
          findAllFiles.sync("/home/user/files", ofBasename("file.html")),
          new Set([resolve("/home/user/files/file.html")]),
        );
      });
      it("should return a set with one file's path if there is only one matching file in a directory among the directories", () => {
        assert.deepEqual(
          findAllFiles.sync(
            ["/home/user/files", "/home/user/symbolic-files"],
            ofBasename("file.md"),
          ),
          new Set([resolve("/home/user/files/file.md")]),
        );
      });
      it("should return a set of matching files in a directory", () => {
        assert.deepEqual(
          findAllFiles.sync("/home/user/files", ofBasename(/^file/)),
          new Set([
            resolve("/home/user/files/file.html"),
            resolve("/home/user/files/file.md"),
          ]),
        );
      });
      it("should return a set of matching files in directories", () => {
        assert.deepEqual(
          findAllFiles.sync(
            ["/home/user/files", "/home/user/symbolic-files"],
            ofBasename("file.html"),
          ),
          new Set([
            resolve("/home/user/files/file.html"),
            resolve("/home/user/symbolic-files/file.html"),
          ]),
        );
      });
      it("should return a set with one directory's path if there is only one matching file in a directory", () => {
        assert.deepEqual(
          findAllFiles.sync("/home/user", ofBasename("files")),
          new Set([resolve("/home/user/files")]),
        );
      });
      it("should return a set with one directory's path if there is only one matching file in a directory among the directories", () => {
        assert.deepEqual(
          findAllFiles.sync(
            ["/home/user/files", "/home/user/"],
            ofBasename("files"),
          ),
          new Set([resolve("/home/user/files")]),
        );
      });
      it("should return a set of matching directories' path in a directory", () => {
        assert.deepEqual(
          findAllFiles.sync("/home/user", ofBasename(/^files/, /files$/)),
          new Set([
            resolve("/home/user/files"),
            resolve("/home/user/symbolic-files"),
          ]),
        );
      });
      it("should return a set of matching directories' path in directories", () => {
        assert.deepEqual(
          findAllFiles.sync(
            ["/home/user", "/home/user/other-folder"],
            ofBasename("files"),
          ),
          new Set([
            resolve("/home/user/files"),
            resolve("/home/user/other-folder/files"),
          ]),
        );
      });
      it("should return a set of matching files and directories' path", () => {
        assert.deepEqual(
          findAllFiles.sync(
            ["/home/user", "/home/user/files"],
            ofBasename(/^file/),
          ),
          new Set([
            resolve("/home/user/files"),
            resolve("/home/user/files/file.md"),
            resolve("/home/user/files/file.html"),
          ]),
        );
      });
      it("should return a sorted set of matching files in a directory", () => {
        assert.deepEqual(
          findAllFiles.sync("/home/user/files", ofBasename(/^_/)),
          new Set([
            resolve("/home/user/files/_a"),
            resolve("/home/user/files/_b"),
            resolve("/home/user/files/_c"),
          ]),
        );
      });
      it("should return a set of sequences of matching files sorted by directory", () => {
        assert.deepEqual(
          findAllFiles.sync(
            ["/home/user/files", "/home/user/symbolic-folder"],
            ofBasename(/^_/),
          ),
          new Set([
            resolve("/home/user/files/_a"),
            resolve("/home/user/files/_b"),
            resolve("/home/user/files/_c"),
            resolve("/home/user/symbolic-folder/_a"),
            resolve("/home/user/symbolic-folder/_b"),
            resolve("/home/user/symbolic-folder/_c"),
          ]),
        );
      });
      it("should throw an error if any of the given directories does not exist", () => {
        assert.throws(() => {
          findAllFiles.sync(
            "./unexistant-folder",
            ofBasename("unexistant.html"),
          );
        });
      });
      it("should throw an error if one of the tests throws an error", () => {
        assert.throws(() =>
          findAllFiles.sync(
            "./",
            (path: string): boolean => {
              throw new Error();
            },
          ),
        );
      });
      it("should throw an error if one of the directories is a file", () => {
        assert.throws(() =>
          findAllFiles.sync(
            ["./", "./file.html"],
            ofBasename("unexistant.html"),
          ),
        );
      });
    });
  });
});