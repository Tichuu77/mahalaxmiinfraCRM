import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Project from '@/models/Project';
import Plot from '@/models/Plot';
import { getAuthUser } from '@/lib/auth';
import { ProjectSchema } from '@/lib/validations';
import { getCached, invalidateCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (id) {
      const project = await Project.findOne({ _id: id, isDeleted: { $ne: true } })
        .populate('createdBy', 'name email phone')
        .lean();

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const plotStats = await Plot.aggregate([
        { $match: { projectId: project._id, isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const stats = { totalPlots: 0, availablePlots: 0, bookedPlots: 0, registeredPlots: 0, reservedPlots: 0 };
      plotStats.forEach(({ _id: status, count }) => {
        stats.totalPlots += count;
        if (status === 'available') stats.availablePlots = count;
        else if (status === 'booked') stats.bookedPlots = count;
        else if (status === 'registered') stats.registeredPlots = count;
        else if (status === 'reserved') stats.reservedPlots = count;
      });

      return NextResponse.json({
        success: true,
        project: {
          ...project,
          stats,
        },
      });
    }

    const filter = { isDeleted: { $ne: true } };
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { code: { $regex: term, $options: 'i' } },
        { location: { $regex: term, $options: 'i' } },
      ];
    }

    const cacheKey = `projects:${status || 'all'}:${search || ''}`;
    const projectsWithStats = await getCached(cacheKey, 10000, async () => {
      // Execute project query and batch plot aggregation concurrently in parallel
      const [projects, plotStats] = await Promise.all([
        Project.find(filter)
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 })
          .lean(),
        Plot.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          {
            $group: {
              _id: { projectId: '$projectId', status: '$status' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const statsMap = {};
      plotStats.forEach(({ _id, count }) => {
        const pId = _id.projectId?.toString();
        if (!pId) return;
        if (!statsMap[pId]) {
          statsMap[pId] = { totalPlots: 0, availablePlots: 0, bookedPlots: 0, registeredPlots: 0, reservedPlots: 0 };
        }
        statsMap[pId].totalPlots += count;
        if (_id.status === 'available') statsMap[pId].availablePlots += count;
        else if (_id.status === 'booked') statsMap[pId].bookedPlots += count;
        else if (_id.status === 'registered') statsMap[pId].registeredPlots += count;
        else if (_id.status === 'reserved') statsMap[pId].reservedPlots += count;
      });

      return projects.map((project) => ({
        ...project,
        stats: statsMap[project._id.toString()] || {
          totalPlots: 0,
          availablePlots: 0,
          bookedPlots: 0,
          registeredPlots: 0,
          reservedPlots: 0,
        },
      }));
    });

    return NextResponse.json({ success: true, projects: projectsWithStats });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Section 5.1: Create Project is restricted to Admin only
    if (!user.roleId?.isRoot && user.roleId?.rank !== 0) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can create projects' }, { status: 403 });
    }

    const body = await req.json();
    const validated = ProjectSchema.parse(body);

    const existing = await Project.findOne({
      code: validated.code.toUpperCase(),
      isDeleted: { $ne: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'Project code already in use' }, { status: 400 });
    }

    const project = await Project.create({
      ...validated,
      code: validated.code.toUpperCase(),
      isDeleted: false,
      createdBy: user._id,
    });

    invalidateCache('projects');
    invalidateCache('dashboard');

    return NextResponse.json({ success: true, project });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!user.roleId?.isRoot && user.roleId?.rank !== 0) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can edit projects' }, { status: 403 });
    }

    const body = await req.json();
    const { _id, ...updateData } = body;
    if (!_id) return NextResponse.json({ error: 'Project _id is required' }, { status: 400 });

    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
      const existing = await Project.findOne({
        code: updateData.code,
        _id: { $ne: _id },
        isDeleted: { $ne: true },
      });
      if (existing) {
        return NextResponse.json({ error: 'Project code already in use by another project' }, { status: 400 });
      }
    }

    const updated = await Project.findOneAndUpdate(
      { _id, isDeleted: { $ne: true } },
      updateData,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    invalidateCache('projects');
    invalidateCache('dashboard');

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!user.roleId?.isRoot && user.roleId?.rank !== 0) {
      return NextResponse.json({ error: 'Forbidden: Only Admin can delete projects' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('id');
    if (!projectId) return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });

    const project = await Project.findOne({ _id: projectId, isDeleted: { $ne: true } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found or already deleted' }, { status: 404 });
    }

    // Soft delete project
    await Project.findByIdAndUpdate(projectId, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    // Soft delete all associated plots
    await Plot.updateMany(
      { projectId },
      { isDeleted: true, deletedAt: new Date() }
    );

    invalidateCache('projects');
    invalidateCache('dashboard');

    return NextResponse.json({ success: true, message: 'Project and associated plots deleted successfully (soft delete)' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
