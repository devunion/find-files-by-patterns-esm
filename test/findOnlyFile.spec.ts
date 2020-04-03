import { rejects } from "assert";
import { assert } from "chai";

import * as mock from "mock-fs";
import { resolve } from "path";

import { findOnlyFile, findOnlyFileSync } from "../src/fileFinders";
import { Filter, FilterSync } from "../src/filter";
import { ofBasename } from "../src/path";

const error: Filter<string> = async () => {
  throw new Error();
};
const errorSync: FilterSync<string> = () => {
  throw new Error();
};
const resolvedPath = (path: string): string => resolve(path);

describe("findOnlyFile", () => {
  beforeEach(() => {
    mock(
      {
        "/home/user": {
          files: {
            "file.md": "",
            "file.html": "",
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
  describe("async", () => {
    describe("(...tests: Array<Filter<string> | FilterSync<string>>): Promise<string | null>", () => {
      it("should arbitrarily resolve to `null` if no arguments are provided", async () => {
        assert.isNull(await findOnlyFile());
      });
      it("should arbitrarily resolve to `null` if only an empty set of tests is provided", async () => {
        const tests: Array<Filter<string>> = [];
        assert.isNull(await findOnlyFile(...tests));
      });
      it("should arbitrarily resolve to `null` if there are no test to perform on files' path", async () => {
        assert.isNull(await findOnlyFile("./"));
      });
      it("should resolve an undefined directory path to the current working directory", async () => {
        assert.strictEqual(
          await findOnlyFile(ofBasename("file.html")),
          resolvedPath("./file.html"),
        );
      });
      it("should resolve to a found directory's path", async () => {
        assert.strictEqual(
          await findOnlyFile(ofBasename("files")),
          resolvedPath("./files"),
        );
      });
      it("should resolve to a found file's path", async () => {
        assert.strictEqual(
          await findOnlyFile(ofBasename("file.html")),
          resolvedPath("./file.html"),
        );
      });
      it("should not resolve to a path that doesn't pass all the tests", async () => {
        assert.isNull(
          await findOnlyFile(ofBasename("file.html"), ofBasename("files")),
        );
      });
      it("should resolve to a path that passes all the tests", async () => {
        assert.isNotNull(
          await findOnlyFile(ofBasename(/^file/), ofBasename(/\.html$/)),
        );
      });
      it("should be rejected if one of the tests throws an error", async () => {
        rejects(findOnlyFile(error));
      });
      it("should be rejected if there is more than one matching file in a directory", async () => {
        rejects(findOnlyFile(ofBasename(/^file/)));
      });
    });
    describe("(directories: string | AsyncIterable<string> | Iterable<string>, ...tests: Array<Filter<string> | FilterSync<string>>): Promise<string | null>", () => {
      it("should arbitrarily resolve to `null` if no arguments are provided", async () => {
        assert.isNull(await findOnlyFile());
      });
      it("should arbitrarily resolve to `null` if only an empty set of directories is provided", async () => {
        assert.isNull(await findOnlyFile([]));
      });
      it("should arbitrarily resolve to `null` if an empty set of directories is provided", async () => {
        assert.isNull(await findOnlyFile([], ofBasename()));
      });
      it("should arbitrarily resolve to `null` if empty sets of directories and tests are provided", async () => {
        assert.isNull(await findOnlyFile([], ...[]));
      });
      it("should handle a directory specified with a string path", async () => {
        assert.strictEqual(
          await findOnlyFile("./", ofBasename("file.html")),
          resolvedPath("./file.html"),
        );
      });
      it("should handle directories specified with string paths", async () => {
        assert.strictEqual(
          await findOnlyFile(["./", "./files"], ofBasename("file.html")),
          resolvedPath("./file.html"),
        );
      });
      it("should resolve directory paths which are not absolute relative to the current working directory", async () => {
        assert.strictEqual(
          await findOnlyFile("./", ofBasename("file.html")),
          resolvedPath("./file.html"),
        );
        assert.strictEqual(
          await findOnlyFile("./files", ofBasename("file.html")),
          resolvedPath("./files/file.html"),
        );
      });
      it("should resolve to null if there is no matching file in a directory", async () => {
        assert.isNull(
          await findOnlyFile("/home/user/files", ofBasename("inexistant.json")),
        );
      });
      it("should resolve to null if there is no matching file in directories", async () => {
        assert.isNull(
          await findOnlyFile(
            ["/home/user/files", "/home/user/symbolic-files"],
            ofBasename("inexistant.json"),
          ),
        );
      });
      it("should resolve to a file's path if there is only one matching file in a directory", async () => {
        assert.strictEqual(
          await findOnlyFile("/home/user/files", ofBasename("file.html")),
          resolvedPath("/home/user/files/file.html"),
        );
      });
      it("should resolve to a file's path if there is only one matching file in a directory among the directories", async () => {
        assert.strictEqual(
          await findOnlyFile(
            ["/home/user/files", "/home/user/symbolic-files"],
            ofBasename("file.html"),
          ),
          resolvedPath("/home/user/files/file.html"),
        );
      });
      it("should resolve to a found directory's path", async () => {
        assert.strictEqual(
          await findOnlyFile("./", ofBasename("files")),
          resolvedPath("./files"),
        );
      });
      it("should resolve to a found file's path", async () => {
        assert.strictEqual(
          await findOnlyFile("./", ofBasename("file.html")),
          resolvedPath("./file.html"),
        );
      });
      it("should be rejected if any of the given directories does not exist", async () => {
        rejects(
          findOnlyFile("./inexistant-folder", ofBasename("inexistant.html")),
        );
      });
      it("should be rejected if one of the tests throws an error", async () => {
        rejects(findOnlyFile("./", error));
      });
      it("should be rejected if there is more than one matching file in a directory", async () => {
        rejects(findOnlyFile("/home/user/files", ofBasename(/^file\./)));
      });
      it("should be rejected if one of the directories is a file", async () => {
        rejects(
          findOnlyFile(["./", "./file.html"], ofBasename("inexistant.html")),
        );
      });
    });
  });
  describe("sync", () => {
    describe("(...tests: Array<FilterSync<string>>): string | null", () => {
      it("should arbitrarily return `null` if no arguments are provided", () => {
        assert.isNull(findOnlyFileSync());
      });
      it("should arbitrarily return `null` if only an empty set of tests is provided", () => {
        const tests: Array<FilterSync<string>> = [];
        assert.isNull(findOnlyFileSync(...tests));
      });
      it("should resolve an undefined directory path to the current working directory", () => {
        assert.strictEqual(
          findOnlyFileSync(ofBasename("file.html")),
          resolve("./file.html"),
        );
      });
      it("should return a found directory's path", () => {
        assert.strictEqual(
          findOnlyFileSync(ofBasename("files")),
          resolve("./files"),
        );
      });
      it("should return a found file's path", () => {
        assert.strictEqual(
          findOnlyFileSync(ofBasename("file.html")),
          resolve("./file.html"),
        );
      });
      it("should not return a path that doesn't pass all the tests", () => {
        assert.isNull(
          findOnlyFileSync(ofBasename("file.html"), ofBasename("files")),
        );
      });
      it("should return a path that passes all the tests", () => {
        assert.isNotNull(
          findOnlyFileSync(ofBasename(/^file/), ofBasename(/\.html$/)),
        );
      });
      it("should throw an error if one of the tests throws an error", () => {
        assert.throws(() => findOnlyFileSync(errorSync));
      });
      it("should throw an error if there is more than one matching file in a directory", () => {
        assert.throws(() => findOnlyFileSync(ofBasename(/^file/)));
      });
    });
    describe("(directories: string | Iterable<string>, ...tests: Array<FilterSync<string>>): string | null", () => {
      it("should arbitrarily return `null` if no arguments are provided", () => {
        assert.isNull(findOnlyFileSync());
      });
      it("should arbitrarily return `null` if only an empty set of directories is provided", () => {
        assert.isNull(findOnlyFileSync([]));
      });
      it("should arbitrarily return `null` if an empty set of directories is provided", () => {
        assert.isNull(findOnlyFileSync([], ofBasename()));
      });
      it("should arbitrarily return `null` if empty sets of directories and tests are provided", () => {
        assert.isNull(findOnlyFileSync([], ...[]));
      });
      it("should arbitrarily return `null` if there are no tests to perform on files' path", () => {
        assert.isNull(findOnlyFileSync("./"));
      });
      it("should handle a directory specified with a string path", () => {
        assert.strictEqual(
          findOnlyFileSync("./", ofBasename("file.html")),
          resolve("./file.html"),
        );
      });
      it("should handle directories specified with string paths", () => {
        assert.strictEqual(
          findOnlyFileSync(["./", "./files"], ofBasename("file.html")),
          resolve("./file.html"),
        );
      });
      it("should resolve directory paths which are not absolute relative to the current working directory", () => {
        assert.strictEqual(
          findOnlyFileSync("./", ofBasename("file.html")),
          resolve("./file.html"),
        );
        assert.strictEqual(
          findOnlyFileSync("./files", ofBasename("file.html")),
          resolve("./files/file.html"),
        );
      });
      it("should return null if there is no matching file in a directory", () => {
        assert.isNull(
          findOnlyFileSync("/home/user/files", ofBasename("inexistant.json")),
        );
      });
      it("should return null if there is no matching file in directories", () => {
        assert.isNull(
          findOnlyFileSync(
            ["/home/user/files", "/home/user/symbolic-files"],
            ofBasename("inexistant.json"),
          ),
        );
      });
      it("should return a file's path if there is only one matching file in a directory", () => {
        assert.strictEqual(
          findOnlyFileSync("/home/user/files", ofBasename("file.html")),
          resolve("/home/user/files/file.html"),
        );
        it("should return a found directory's path", () => {
          assert.strictEqual(
            findOnlyFileSync("./", ofBasename("files")),
            resolve("./files"),
          );
        });
        it("should return a found file's path", () => {
          assert.strictEqual(
            findOnlyFileSync("./", ofBasename("file.html")),
            resolve("./file.html"),
          );
        });
      });
      it("should return a file's path if there is only one matching file in a directory among the directories", () => {
        assert.strictEqual(
          findOnlyFileSync(
            ["/home/user/files", "/home/user/symbolic-files"],
            ofBasename("file.html"),
          ),
          resolve("/home/user/files/file.html"),
        );
      });
      it("should throw an error if any of the given directories does not exist", () => {
        assert.throws(() => {
          findOnlyFileSync(
            "./inexistant-folder",
            ofBasename("inexistant.html"),
          );
        });
      });
      it("should throw an error if one of the tests throws an error", () => {
        assert.throws(() => findOnlyFileSync("./", errorSync));
      });
      it("should throw an error if there is more than one matching file in a directory", () => {
        assert.throws(() =>
          findOnlyFileSync("/home/user/files", ofBasename(/^file\./)),
        );
      });
      it("should be rejected if one of the directories is a file", () => {
        assert.throws(() =>
          findOnlyFileSync(
            ["./", "./file.html"],
            ofBasename("inexistant.html"),
          ),
        );
      });
    });
  });
});
