import { Body, Controller, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from 'src/guards/auth.guard';
import type { IJwtPayload } from '@hangbank/shared';
import { ExportService } from './export.service';
import { ExportFormat } from './export-format.enum';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  // Streams a project's selected audio files as a ZIP archive in the chosen format.
  // Owner-only — the permission check + data collection run before we touch the
  // response, so any error is surfaced by Nest's exception filter (not mid-stream).
  @UseGuards(AuthGuard)
  @Post(':projectId')
  async export(
    @Req() req: { user: IJwtPayload },
    @Param('projectId') projectId: string,
    @Body() body: { format?: ExportFormat; audioFileIds?: string[] },
    @Res() res: Response,
  ) {
    const archive = await this.exportService.export(req.user.id, projectId, {
      format: body?.format ?? ExportFormat.LJSpeech,
      audioFileIds: body?.audioFileIds,
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="export-${projectId}.zip"`,
    );

    archive.on('error', (err: Error) => {
      console.error('Export archive stream error', err);
      res.destroy(err);
    });

    archive.pipe(res);
  }
}
