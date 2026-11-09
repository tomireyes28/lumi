import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('public release metadata', () => {
  const originalRailwayRevision = process.env.RAILWAY_GIT_COMMIT_SHA;
  const originalSourceRevision = process.env.SOURCE_REVISION;
  const service = new AppService({} as PrismaService);

  afterEach(() => {
    if (originalRailwayRevision === undefined)
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
    else process.env.RAILWAY_GIT_COMMIT_SHA = originalRailwayRevision;
    if (originalSourceRevision === undefined)
      delete process.env.SOURCE_REVISION;
    else process.env.SOURCE_REVISION = originalSourceRevision;
  });

  it('identifies the Railway commit instead of a generic package version', () => {
    process.env.RAILWAY_GIT_COMMIT_SHA =
      'a882c803b75ebbac4e00de1e7b4185412802eca8';
    process.env.SOURCE_REVISION = '1111111111111111111111111111111111111111';
    expect(service.getVersion().revision).toBe(
      process.env.RAILWAY_GIT_COMMIT_SHA,
    );
  });

  it('never echoes arbitrary environment values in public metadata', () => {
    process.env.RAILWAY_GIT_COMMIT_SHA = 'not-a-commit-do-not-publish';
    expect(service.getVersion()).toEqual({
      service: 'lumi-api',
      revision: 'unknown',
    });
  });
});
